#if canImport(EventKit)
import SwiftUI
import AppKit
import EventKit
import Security

private let bridgeEndpoint = URL(string: "https://moczyyqxcveqewvxjiph.supabase.co/functions/v1/personal-mac-bridge")!
private let appVersion = "1.0.0"

struct BridgeCalendar: Codable { let id:String; let title:String; let account:String; let source_type:String; let color:String? }
struct BridgeEvent: Codable {
    let external_id:String; let title:String; let starts_at:String; let ends_at:String; let all_day:Bool
    let location:String?; let notes:String?; let source_calendar:String; let source_calendar_id:String
    let source_color:String?; let source_account:String?
}
struct CalendarPayload: Codable {
    let action:String; let device_id:String; let device_name:String; let app_version:String
    let window_start:String; let window_end:String; let calendars:[BridgeCalendar]; let events:[BridgeEvent]
}
struct MailItem: Codable {
    let account_email:String; let mail_message_id:String; let provider_message_id:String; let thread_id:String
    let direction:String; let sender:String; let recipients:[String]; let subject:String; let snippet:String
    let body_preview:String; let received_at:String; let unread:Bool; let has_attachments:Bool; let folder:String; let message_id_header:String
}
struct MailPayload: Codable { let action:String; let device_id:String; let device_name:String; let app_version:String; let messages:[MailItem] }
struct CommandEnvelope: Decodable { let ok:Bool?; let commands:[BridgeCommand]? }
struct BridgeCommand: Decodable { let id:String; let command_type:String; let payload:[String:JSONValue] }
enum JSONValue: Decodable {
    case string(String), number(Double), bool(Bool), array([JSONValue]), object([String:JSONValue]), null
    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil(){ self = .null }
        else if let v = try? c.decode(Bool.self){ self = .bool(v) }
        else if let v = try? c.decode(Double.self){ self = .number(v) }
        else if let v = try? c.decode(String.self){ self = .string(v) }
        else if let v = try? c.decode([JSONValue].self){ self = .array(v) }
        else { self = .object(try c.decode([String:JSONValue].self)) }
    }
    var stringValue:String? { if case .string(let s)=self{return s}; return nil }
    var arrayValue:[JSONValue]? { if case .array(let a)=self{return a}; return nil }
    var objectValue:[String:JSONValue]? { if case .object(let o)=self{return o}; return nil }
}

final class KeychainStore {
    static let shared = KeychainStore(); private init(){}
    private let service = "com.personal-os.mac-bridge"
    func get(_ key:String)->String {
        let q:[String:Any]=[kSecClass as String:kSecClassGenericPassword,kSecAttrService as String:service,kSecAttrAccount as String:key,kSecReturnData as String:true]
        var item:CFTypeRef?; guard SecItemCopyMatching(q as CFDictionary,&item)==errSecSuccess, let d=item as? Data else{return ""}; return String(data:d,encoding:.utf8) ?? ""
    }
    func set(_ key:String,_ value:String){
        let base:[String:Any]=[kSecClass as String:kSecClassGenericPassword,kSecAttrService as String:service,kSecAttrAccount as String:key]
        SecItemDelete(base as CFDictionary); let d=value.data(using:.utf8) ?? Data(); var q=base; q[kSecValueData as String]=d; SecItemAdd(q as CFDictionary,nil)
    }
}

@MainActor final class BridgeModel: ObservableObject {
    @Published var status = "Starting…"
    @Published var lastCalendarSync:Date?
    @Published var lastMailSync:Date?
    @Published var bridgeKey = KeychainStore.shared.get("bridge-key")
    @Published var fallbackMailAccounts = UserDefaults.standard.string(forKey:"fallback-mail") ?? "kenneth.lutz@threeriversdx.com"
    @Published var mailFallbackEnabled = UserDefaults.standard.object(forKey:"mail-fallback-enabled") as? Bool ?? true
    @Published var autoSyncEnabled = UserDefaults.standard.object(forKey:"calendar-auto-enabled") as? Bool ?? true
    let store = EKEventStore()
    let deviceID:String
    private var changeObserver:NSObjectProtocol?
    private var loopTask:Task<Void,Never>?
    private var debounceTask:Task<Void,Never>?
    private let iso:ISO8601DateFormatter = { let f=ISO8601DateFormatter(); f.formatOptions=[.withInternetDateTime,.withFractionalSeconds]; return f }()

    init(){
        if let saved=UserDefaults.standard.string(forKey:"device-id"){deviceID=saved}else{let n=UUID().uuidString;UserDefaults.standard.set(n,forKey:"device-id");deviceID=n}
        changeObserver=NotificationCenter.default.addObserver(forName:.EKEventStoreChanged,object:store,queue:.main){[weak self]_ in Task{@MainActor in self?.eventStoreChanged()}}
        loopTask=Task{[weak self] in while !Task.isCancelled { guard let self else{return}; await self.pollCommands(); if self.mailFallbackEnabled { await self.syncMailFallback() }; try? await Task.sleep(for:.seconds(60)) }}
        Task{ await requestPermissions(); if autoSyncEnabled { await syncCalendar() } }
    }
    deinit { if let o=changeObserver{NotificationCenter.default.removeObserver(o)}; loopTask?.cancel() }
    func saveSettings(){KeychainStore.shared.set("bridge-key",bridgeKey.trimmingCharacters(in:.whitespacesAndNewlines));UserDefaults.standard.set(fallbackMailAccounts,forKey:"fallback-mail");UserDefaults.standard.set(mailFallbackEnabled,forKey:"mail-fallback-enabled");UserDefaults.standard.set(autoSyncEnabled,forKey:"calendar-auto-enabled");status="Settings saved"}
    private func eventStoreChanged(){guard autoSyncEnabled else{return};debounceTask?.cancel();debounceTask=Task{[weak self] in try? await Task.sleep(for:.seconds(4));if Task.isCancelled{return};await self?.syncCalendar()}}
    func requestPermissions() async {
        do { let cal=try await store.requestFullAccessToEvents(); let rem=try await store.requestFullAccessToReminders(); status = (cal ? "Calendar access granted" : "Calendar access denied") + (rem ? " · Reminders granted" : " · Reminders denied") }
        catch { status="Permission error: \(error.localizedDescription)" }
    }
    private func colorHex(_ cg:CGColor?)->String?{guard let c=cg?.components,c.count>=3 else{return nil};let vals=c.count>=4 ? c : [c[0],c[0],c[0],1];return String(format:"#%02X%02X%02X",Int(vals[0]*255),Int(vals[1]*255),Int(vals[2]*255))}
    private func payloadHeaders()->[String:String]?{let k=bridgeKey.trimmingCharacters(in:.whitespacesAndNewlines);if k.isEmpty{return nil};return["Content-Type":"application/json","X-Personal-OS-Bridge-Key":k]}
    private func post<T:Encodable>(_ value:T) async throws -> Data { guard let headers=payloadHeaders() else{throw NSError(domain:"Bridge",code:1,userInfo:[NSLocalizedDescriptionKey:"Paste the bridge key in Settings first."])};var r=URLRequest(url:bridgeEndpoint);r.httpMethod="POST";headers.forEach{r.setValue($1,forHTTPHeaderField:$0)};r.httpBody=try JSONEncoder().encode(value);let(data,res)=try await URLSession.shared.data(for:r);guard let h=res as? HTTPURLResponse,(200..<300).contains(h.statusCode) else{throw NSError(domain:"Bridge",code:2,userInfo:[NSLocalizedDescriptionKey:String(data:data,encoding:.utf8) ?? "Bridge request failed"])};return data }
    private func postObject(_ object:[String:Any]) async throws -> Data { guard let headers=payloadHeaders() else{throw NSError(domain:"Bridge",code:1,userInfo:[NSLocalizedDescriptionKey:"Paste the bridge key in Settings first."])};var r=URLRequest(url:bridgeEndpoint);r.httpMethod="POST";headers.forEach{r.setValue($1,forHTTPHeaderField:$0)};r.httpBody=try JSONSerialization.data(withJSONObject:object);let(data,res)=try await URLSession.shared.data(for:r);guard let h=res as? HTTPURLResponse,(200..<300).contains(h.statusCode) else{throw NSError(domain:"Bridge",code:2,userInfo:[NSLocalizedDescriptionKey:String(data:data,encoding:.utf8) ?? "Bridge request failed"])};return data }
    func syncCalendar() async {
        guard EKEventStore.authorizationStatus(for:.event)==.fullAccess else{status="Calendar permission required";return}
        status="Syncing Apple Calendar…";let start=Calendar.current.date(byAdding:.day,value:-90,to:Date())!,end=Calendar.current.date(byAdding:.day,value:730,to:Date())!
        var calendars:[BridgeCalendar]=store.calendars(for:.event).map{BridgeCalendar(id:$0.calendarIdentifier,title:$0.title,account:$0.source.title,source_type:"event",color:colorHex($0.cgColor))}
        var events:[BridgeEvent]=store.events(matching:store.predicateForEvents(withStart:start,end:end,calendars:nil)).map{e in
            let eid=(e.eventIdentifier ?? e.calendarItemIdentifier)+"|"+iso.string(from:e.startDate)
            return BridgeEvent(external_id:eid,title:e.title ?? "(untitled)",starts_at:iso.string(from:e.startDate),ends_at:iso.string(from:e.endDate),all_day:e.isAllDay,location:e.location,notes:e.notes,source_calendar:e.calendar.title,source_calendar_id:e.calendar.calendarIdentifier,source_color:colorHex(e.calendar.cgColor),source_account:e.calendar.source.title)
        }
        if EKEventStore.authorizationStatus(for:.reminder)==.fullAccess {
            let remCals=store.calendars(for:.reminder); calendars += remCals.map{BridgeCalendar(id:"reminder:"+$0.calendarIdentifier,title:$0.title,account:$0.source.title,source_type:"reminder",color:colorHex($0.cgColor))}
            let reminders=await fetchReminders(start:start,end:end)
            for r in reminders { guard let comp=r.dueDateComponents,let due=Calendar.current.date(from:comp) else{continue};let hasTime=comp.hour != nil;let finish=Calendar.current.date(byAdding:.minute,value:hasTime ? 30 : 0,to:due) ?? due;events.append(BridgeEvent(external_id:"reminder:"+r.calendarItemIdentifier+"|"+iso.string(from:due),title:r.title,starts_at:iso.string(from:due),ends_at:iso.string(from:finish),all_day:!hasTime,location:r.location,notes:r.notes,source_calendar:r.calendar.title,source_calendar_id:"reminder:"+r.calendar.calendarIdentifier,source_color:colorHex(r.calendar.cgColor),source_account:r.calendar.source.title)) }
        }
        do { let payload=CalendarPayload(action:"calendar-sync",device_id:deviceID,device_name:Host.current().localizedName ?? "Mac",app_version:appVersion,window_start:iso.string(from:start),window_end:iso.string(from:end),calendars:calendars,events:events);_ = try await post(payload);lastCalendarSync=Date();status="Calendar synced · \(events.count) items" } catch { status="Calendar sync failed: \(error.localizedDescription)" }
    }
    private func fetchReminders(start:Date,end:Date) async -> [EKReminder] { await withCheckedContinuation{cont in store.fetchReminders(matching:store.predicateForIncompleteReminders(withDueDateStarting:start,ending:end,calendars:nil)){cont.resume(returning:$0 ?? [])}} }
    private func targets()->[String]{fallbackMailAccounts.split(separator:",").map{$0.trimmingCharacters(in:.whitespacesAndNewlines).lowercased()}.filter{!$0.isEmpty}}
    func syncMailFallback() async { guard !targets().isEmpty,!bridgeKey.isEmpty else{return};do{let items=try runMailRead(targets:targets());if items.isEmpty{return};_ = try await post(MailPayload(action:"mail-sync",device_id:deviceID,device_name:Host.current().localizedName ?? "Mac",app_version:appVersion,messages:items));lastMailSync=Date()}catch{status="Mail fallback: \(error.localizedDescription)"}}
    private func runJXA(_ script:String)->String?{let p=Process();p.executableURL=URL(fileURLWithPath:"/usr/bin/osascript");p.arguments=["-l","JavaScript","-e",script];let out=Pipe(),err=Pipe();p.standardOutput=out;p.standardError=err;do{try p.run();p.waitUntilExit();if p.terminationStatus != 0{return nil};let d=out.fileHandleForReading.readDataToEndOfFile();return String(data:d,encoding:.utf8)}catch{return nil}}
    private func runMailRead(targets:[String]) throws -> [MailItem] {
        let td=try JSONSerialization.data(withJSONObject:targets),ts=String(data:td,encoding:.utf8)!;
        let js="""
        const Mail=Application('Mail'); const targets=\(ts); let out=[];
        function val(fn,def=''){try{return fn()}catch(e){return def}}
        for(const a of Mail.accounts()){
          const emails=val(()=>a.emailAddresses(),[]).map(x=>String(x).toLowerCase()); const target=targets.find(x=>emails.includes(x)); if(!target) continue;
          const boxes=val(()=>a.mailboxes(),[]); const box=boxes.find(b=>['inbox','inbox'].includes(String(val(()=>b.name(),'')).toLowerCase())); if(!box) continue;
          const msgs=val(()=>box.messages(),[]); const max=Math.min(msgs.length,120);
          for(let i=0;i<max;i++){const m=msgs[i],content=String(val(()=>m.content(),'')),mid=String(val(()=>m.messageId(),val(()=>m.id(),''))),d=val(()=>m.dateReceived(),new Date());out.push({account_email:target,mail_message_id:String(val(()=>m.id(),mid)),provider_message_id:mid||String(val(()=>m.id(),'')),thread_id:mid||String(val(()=>m.id(),'')),direction:'inbound',sender:String(val(()=>m.sender(),'')),recipients:[],subject:String(val(()=>m.subject(),'')),snippet:content.slice(0,500),body_preview:content.slice(0,20000),received_at:(new Date(d)).toISOString(),unread:!Boolean(val(()=>m.readStatus(),false)),has_attachments:false,folder:'INBOX',message_id_header:mid});}
        }
        JSON.stringify(out)
        """;
        guard let s=runJXA(js),let d=s.data(using:.utf8) else{throw NSError(domain:"Mail",code:1,userInfo:[NSLocalizedDescriptionKey:"Apple Mail automation permission is required."])};return try JSONDecoder().decode([MailItem].self,from:d)
    }
    func pollCommands() async { guard !bridgeKey.isEmpty else{return};do{let d=try await postObject(["action":"commands-poll","device_id":deviceID,"device_name":Host.current().localizedName ?? "Mac","app_version":appVersion]);let env=try JSONDecoder().decode(CommandEnvelope.self,from:d);for c in env.commands ?? []{await execute(c)}}catch{} }
    private func execute(_ c:BridgeCommand) async { var ok=true,err="";do{switch c.command_type{case "calendar-sync-now":await syncCalendar();case "mail-trash":try executeMailTrash(c);case "mail-reply":try executeMailReply(c);default:break}}catch{ok=false;err=error.localizedDescription};try? await postObject(["action":"command-complete","device_id":deviceID,"command_id":c.id,"ok":ok,"error":err]) }
    private func executeMailTrash(_ c:BridgeCommand) throws { guard let items=c.payload["items"]?.arrayValue else{return};for item in items{guard let o=item.objectValue,let id=o["mail_message_id"]?.stringValue else{continue};let safeID=id.replacingOccurrences(of:"'",with:"\\'"); let js="const Mail=Application(\"Mail\"); const wanted=\"\(safeID)\"; let done=false; for(const a of Mail.accounts()){for(const b of a.mailboxes()){for(const m of b.messages()){if(String(m.id())===wanted){Mail.delete(m);done=true;break}}if(done)break}if(done)break}done?\"ok\":\"missing\""; _ = runJXA(js)} }
    private func executeMailReply(_ c:BridgeCommand) throws { guard let id=c.payload["mail_message_id"]?.stringValue,let text=c.payload["text"]?.stringValue else{return};let safeID=id.replacingOccurrences(of:"'",with:"\\'"),safeText=text.replacingOccurrences(of:"\\",with:"\\\\").replacingOccurrences(of:"'",with:"\\'").replacingOccurrences(of:"\n",with:"\\n");let js="const Mail=Application(\"Mail\");const wanted=\"\(safeID)\",body=\"\(safeText)\";let found=null,from=\"\";for(const a of Mail.accounts()){for(const b of a.mailboxes()){for(const m of b.messages()){if(String(m.id())===wanted){found=m;from=String(m.sender());break}}if(found)break}if(found)break}if(found){let addr=(from.match(/<([^>]+)>/)||from.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/i)||[])[1]||from;let sub=String(found.subject()||\"\");if(!/^re:/i.test(sub))sub=\"Re: \"+sub;let out=Mail.OutgoingMessage({subject:sub,content:body+\"\\n\",visible:false});Mail.outgoingMessages.push(out);out.toRecipients.push(Mail.ToRecipient({address:addr}));out.send();\"sent\"}else{\"missing\"}"; guard runJXA(js) != nil else{throw NSError(domain:"Mail",code:2,userInfo:[NSLocalizedDescriptionKey:"Could not send through Apple Mail."])} }
}

struct BridgeMenu: View {
    @ObservedObject var model:BridgeModel
    var body: some View { VStack(alignment:.leading,spacing:10){Text("Personal OS Mac Bridge").font(.headline);Text(model.status).font(.caption).foregroundStyle(.secondary);Divider();Button("Sync Apple Calendar Now"){Task{await model.syncCalendar()}};Button("Sync Mail Fallback Now"){Task{await model.syncMailFallback()}};Divider();SettingsLink{Text("Settings…")};Button("Open Personal OS"){NSWorkspace.shared.open(URL(string:"https://kennethlutz36.github.io/personal-os/")!)};Button("Quit"){NSApp.terminate(nil)}}.padding(10).frame(width:290) }
}
struct BridgeSettings: View {
    @ObservedObject var model:BridgeModel
    var body: some View { Form { SecureField("Bridge key",text:$model.bridgeKey).textFieldStyle(.roundedBorder);Toggle("Auto-sync Apple Calendar when it changes",isOn:$model.autoSyncEnabled);Toggle("Use Apple Mail fallback",isOn:$model.mailFallbackEnabled);TextField("Fallback email addresses",text:$model.fallbackMailAccounts).textFieldStyle(.roundedBorder);Text("Default fallback: kenneth.lutz@threeriversdx.com. Separate multiple addresses with commas.").font(.caption).foregroundStyle(.secondary);HStack{Button("Grant Calendar + Reminders Access"){Task{await model.requestPermissions()}};Button("Save Settings"){model.saveSettings()}.buttonStyle(.borderedProminent)}}.padding(20).frame(width:560) }
}
@main struct PersonalOSMacBridgeApp: App {
    @StateObject private var model=BridgeModel()
    var body: some Scene { MenuBarExtra("Personal OS",systemImage:"square.grid.2x2") { BridgeMenu(model:model) }; Settings { BridgeSettings(model:model) } }
}
#else
import Foundation
print("Personal OS Mac Bridge requires macOS with EventKit.")
#endif