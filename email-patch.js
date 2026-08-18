(()=>{
  'use strict';
  try {
    const VERSION='email-safe-v1';
    let ds=null, overlay=null, accounts=[], messages=[], filter='all', syncing=false, syncText='';
    const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const fmt=v=>{if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});};
    const areaClass=a=>({'Primeva Labs':'labs','Primeva Health':'health','Personal':'personal','Three Rivers':'three'}[a]||'personal');
    const providerLabel=p=>({hostinger:'Hostinger',google:'Google',microsoft:'Microsoft'}[p]||p||'Unknown');
    const activeAccounts=()=>accounts.filter(a=>a.sync_status!=='ignored');
    const hostingerAccounts=()=>activeAccounts().filter(a=>a.provider==='hostinger'&&a.sync_status==='connected');

    async function loadData(){
      if(!ds?.user)return;
      const [a,m]=await Promise.all([
        ds.client.from('email_accounts').select('*').order('area').order('email_address'),
        ds.client.from('email_messages').select('*').order('received_at',{ascending:false}).limit(500)
      ]);
      if(a.error)throw a.error;
      if(m.error)throw m.error;
      accounts=a.data||[];
      messages=m.data||[];
    }

    function uniqueThreads(rows){
      const seen=new Set(), out=[];
      for(const m of rows){
        const key=m.thread_id||m.provider_message_id||m.id;
        if(seen.has(key))continue;
        seen.add(key);out.push(m);
      }
      return out;
    }

    function visibleMessages(){
      let rows=messages.slice();
      if(filter==='needs_reply')rows=rows.filter(m=>m.action_state==='needs_reply');
      else if(filter==='waiting_on')rows=rows.filter(m=>m.action_state==='waiting_on');
      else if(filter==='labs')rows=rows.filter(m=>m.area==='Primeva Labs');
      else if(filter==='health')rows=rows.filter(m=>m.area==='Primeva Health');
      else if(filter==='personal')rows=rows.filter(m=>m.area==='Personal');
      return uniqueThreads(rows).slice(0,180);
    }

    function accountRow(a){
      const connected=a.sync_status==='connected';
      return `<div class="email-account-row">
        <div class="email-avatar ${areaClass(a.area)}">${esc(a.area.split(' ').map(x=>x[0]).join('').slice(0,2))}</div>
        <div class="email-account-main"><b>${esc(a.email_address)}</b><span>${esc(a.area)} · ${esc(providerLabel(a.provider))}</span></div>
        <div class="email-account-count"><strong>${Number(a.unread_count||0)}</strong><span>unread</span></div>
        <span class="email-status ${connected?'connected':''}">${connected?'Connected':'Not connected'}</span>
      </div>`;
    }

    function messageRow(m){
      const who=m.direction==='outbound'?'You':(m.sender||'Unknown sender');
      return `<button type="button" class="email-message-row ${m.unread?'unread':''}" data-email-message="${esc(m.id)}">
        <div class="email-message-dot ${areaClass(m.area)}"></div>
        <div class="email-message-main">
          <div class="email-message-top"><b>${esc(who)}</b><span>${fmt(m.received_at)}</span></div>
          <strong>${esc(m.subject||'(no subject)')}</strong>
          <p>${esc(m.snippet||m.body_preview||'')}</p>
          <div class="email-meta"><span>${esc(m.account_email)}</span><span>${esc(m.area||'')}</span>${m.action_state&&m.action_state!=='none'?`<span class="email-action-state">${esc(m.action_state.replaceAll('_',' '))}</span>`:''}</div>
        </div>
      </button>`;
    }

    function messageModal(m){
      document.getElementById('personalOsEmailMessageModal')?.remove();
      const wrap=document.createElement('div');
      wrap.id='personalOsEmailMessageModal';wrap.className='email-modal-wrap';
      const recipients=Array.isArray(m.recipients)?m.recipients.join(', '):'';
      wrap.innerHTML=`<div class="email-message-modal"><div class="email-modal-head"><div><div class="eyebrow">${esc(m.area||'EMAIL')} · ${esc(m.account_email)}</div><h3>${esc(m.subject||'(no subject)')}</h3></div><button type="button" data-email-modal-close>×</button></div><div class="email-message-info"><b>From:</b> ${esc(m.sender||m.account_email||'')}<br><b>To:</b> ${esc(recipients)}<br><b>Date:</b> ${fmt(m.received_at)}${m.action_state&&m.action_state!=='none'?`<br><b>Personal OS:</b> ${esc(m.action_state.replaceAll('_',' '))}`:''}</div><div class="email-message-body">${esc(m.body_preview||m.snippet||'No body preview available.')}</div><p class="email-readonly-note">Read-only preview. Personal OS does not mark this message read, archive it, or send anything.</p></div>`;
      document.body.appendChild(wrap);
      const close=()=>wrap.remove();
      wrap.querySelector('[data-email-modal-close]')?.addEventListener('click',close);
      wrap.addEventListener('click',e=>{if(e.target===wrap)close();});
    }

    function render(){
      if(!overlay)return;
      const active=activeAccounts();
      const connected=active.filter(a=>a.sync_status==='connected').length;
      const unread=active.reduce((s,a)=>s+Number(a.unread_count||0),0);
      const need=uniqueThreads(messages.filter(m=>m.action_state==='needs_reply')).length;
      const waiting=uniqueThreads(messages.filter(m=>m.action_state==='waiting_on')).length;
      const rows=visibleMessages();
      overlay.innerHTML=`<div class="email-shell">
        <header class="email-header"><div><div class="eyebrow">PERSONAL OPERATING SYSTEM</div><h1>Email</h1><p>${connected}/${active.length} active identities connected · recent working inbox.</p></div><div class="email-header-actions"><button class="email-btn secondary" id="emailSyncPrimeva" ${syncing?'disabled':''}>${syncing?esc(syncText||'Syncing…'):'↻ Sync Primeva'}</button><button class="email-close" id="emailClose">×</button></div></header>
        <div class="email-content">
          <section class="email-kpis"><div><span>ACTIVE ACCOUNTS</span><strong>${connected}/${active.length}</strong></div><div><span>UNREAD</span><strong>${unread}</strong></div><div><span>NEEDS REPLY</span><strong>${need}</strong></div><div><span>WAITING ON</span><strong>${waiting}</strong></div></section>
          <section class="email-grid">
            <aside class="email-accounts"><div class="email-section-head"><div><h3>MAILBOXES</h3><span>Messages stay tied to the mailbox that received them.</span></div></div>${active.map(accountRow).join('')}<div class="email-paused"><b>Three Rivers paused</b><span>Microsoft tenant admin approval is required, so it is excluded from active counts.</span></div></aside>
            <main class="email-inbox"><div class="email-section-head"><div><h3>UNIFIED INBOX</h3><span>Gmail + recent Primeva Inbox/Sent context.</span></div></div>
              <div class="email-filters">${[['all','All'],['needs_reply','Needs Reply'],['waiting_on','Waiting On'],['labs','Labs'],['health','Health'],['personal','Personal']].map(([k,l])=>`<button type="button" data-email-filter="${k}" class="${filter===k?'active':''}">${l}</button>`).join('')}</div>
              <div class="email-message-list">${rows.length?rows.map(messageRow).join(''):`<div class="email-empty"><div>✉</div><h3>${syncing?'Syncing Primeva messages…':'No messages in this view yet.'}</h3><p>${messages.length?'Choose another filter.':'Your Gmail bridge will populate automatically; Primeva sync runs when you open Email or press Sync Primeva.'}</p></div>`}</div>
            </main>
          </section>
        </div>
      </div>`;
      bindOverlay();
    }

    function bindOverlay(){
      overlay.querySelector('#emailClose')?.addEventListener('click',hideEmail);
      overlay.querySelector('#emailSyncPrimeva')?.addEventListener('click',()=>syncPrimeva(true));
      overlay.querySelectorAll('[data-email-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.emailFilter||'all';render();}));
      overlay.querySelectorAll('[data-email-message]').forEach(b=>b.addEventListener('click',()=>{const m=messages.find(x=>x.id===b.dataset.emailMessage);if(m)messageModal(m);}));
    }

    async function syncOne(account,index,total){
      syncText=`Syncing ${index}/${total}`;render();
      try{
        const {data,error}=await ds.client.functions.invoke('hostinger-email',{body:{action:'sync-recent',account_email:account.email_address}});
        if(error)throw error;
        if(data?.error)throw new Error(data.error);
        return {ok:true};
      }catch(e){console.warn('Primeva email sync failed',account.email_address,e);return {ok:false,error:e};}
    }

    async function syncPrimeva(force=false){
      if(syncing||!ds?.user)return;
      const last=Number(sessionStorage.getItem('pos_email_safe_sync')||0);
      if(!force&&Date.now()-last<10*60*1000)return;
      const list=hostingerAccounts();
      if(!list.length)return;
      syncing=true;syncText='Starting sync…';render();
      let failures=0;
      try{
        for(let i=0;i<list.length;i+=2){
          const batch=list.slice(i,i+2);
          const results=await Promise.all(batch.map((a,j)=>syncOne(a,Math.min(i+j+1,list.length),list.length)));
          failures+=results.filter(r=>!r.ok).length;
          await loadData();render();
        }
        sessionStorage.setItem('pos_email_safe_sync',String(Date.now()));
      }catch(e){console.warn('Primeva email sync',e);failures++;}
      finally{
        syncing=false;syncText='';
        try{await loadData();}catch(e){console.warn('email reload',e);}
        render();
        if(failures)console.warn(`${failures} Primeva mailbox sync(s) failed`);
      }
    }

    async function showEmail(){
      try{
        await loadData();
        if(!overlay){overlay=document.createElement('div');overlay.id='personalOsEmailOverlay';document.body.appendChild(overlay);}
        overlay.style.display='block';document.body.classList.add('email-open');render();
        syncPrimeva(false);
      }catch(e){console.warn('Email open failed',e);}
    }
    function hideEmail(){if(overlay)overlay.style.display='none';document.body.classList.remove('email-open');}

    function replaceCalendarLabel(root){
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;
      while((n=walker.nextNode())){if(n.nodeValue?.trim()==='Calendar'){n.nodeValue=n.nodeValue.replace('Calendar','Email');return true;}}
      return false;
    }
    function ensureNav(){
      if(document.getElementById('emailNavItem'))return true;
      const labels=[...document.querySelectorAll('body *')].filter(x=>x.childElementCount===0&&x.textContent?.trim()==='Calendar');
      const label=labels[0];if(!label)return false;
      const item=label.closest('button,a,[role="button"]')||label.parentElement;if(!item)return false;
      const clone=item.cloneNode(true);clone.id='emailNavItem';replaceCalendarLabel(clone);
      const svg=clone.querySelector('svg');if(svg)svg.outerHTML='<span class="email-nav-icon">✉</span>';
      clone.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();showEmail();});
      item.insertAdjacentElement('afterend',clone);return true;
    }

    function addStyles(){
      if(document.getElementById('emailPatchStyles'))return;
      const style=document.createElement('style');style.id='emailPatchStyles';style.textContent=`
      #personalOsEmailOverlay{position:fixed;inset:0 0 0 252px;z-index:9000;background:#f5f7fb;overflow:auto;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#182236}.email-shell{min-height:100vh}.email-header{height:150px;background:#fff;border-bottom:1px solid #e5eaf2;padding:27px 34px;box-sizing:border-box;display:flex;justify-content:space-between;align-items:center}.email-header h1{font-size:28px;margin:5px 0}.email-header p{font-size:11px;color:#8b96a9;margin:0}.eyebrow{font-size:9px;letter-spacing:.18em;color:#8591a5;font-weight:800}.email-header-actions{display:flex;gap:10px}.email-close{width:40px;height:40px;border:1px solid #dce3ee;border-radius:12px;background:#fff;font-size:23px;color:#66748b;cursor:pointer}.email-content{padding:24px 34px 60px}.email-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px}.email-kpis>div{background:#fff;border:1px solid #e2e8f1;border-radius:15px;padding:14px 16px}.email-kpis span{font-size:9px;color:#8793a7;display:block}.email-kpis strong{font-size:22px;margin-top:4px;display:block}.email-grid{display:grid;grid-template-columns:minmax(360px,.86fr) minmax(500px,1.3fr);gap:16px}.email-accounts,.email-inbox{background:#fff;border:1px solid #e2e8f1;border-radius:18px;padding:17px;min-height:560px}.email-section-head{display:flex;justify-content:space-between;margin-bottom:12px}.email-section-head h3{font-size:11px;letter-spacing:.08em;margin:0 0 4px}.email-section-head span{font-size:9px;color:#8a95a8}.email-account-row{display:grid;grid-template-columns:34px minmax(0,1fr) 48px 78px;gap:8px;align-items:center;border-top:1px solid #edf0f5;padding:10px 0}.email-avatar{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;font-size:9px;font-weight:800}.email-avatar.labs,.email-message-dot.labs{background:#eef1ff;color:#5d6fe8}.email-avatar.health,.email-message-dot.health{background:#edf9f4;color:#289d70}.email-avatar.three,.email-message-dot.three{background:#eef6ff;color:#3b82c4}.email-avatar.personal,.email-message-dot.personal{background:#f4f0ff;color:#7a5bd5}.email-account-main{min-width:0}.email-account-main b{font-size:10px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.email-account-main span,.email-account-count span{font-size:8px;color:#8995a8;display:block;margin-top:2px}.email-account-count{text-align:center}.email-account-count strong{font-size:11px}.email-status{font-size:8px;color:#9aa4b5;background:#f1f3f7;border-radius:99px;padding:5px 7px;text-align:center}.email-status.connected{color:#278963;background:#edf8f3}.email-btn{border:0;border-radius:10px;background:#5c70ea;color:white;font-weight:700;font-size:9px;padding:10px 11px;cursor:pointer}.email-btn.secondary{background:#fff;color:#536078;border:1px solid #dce3ee}.email-btn:disabled{opacity:.6}.email-paused{margin-top:12px;border:1px dashed #dbe1ea;background:#fafbfc;border-radius:10px;padding:10px}.email-paused b{font-size:9px;display:block}.email-paused span{font-size:8px;color:#8a95a8;display:block;line-height:1.45;margin-top:3px}.email-filters{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px}.email-filters button{border:1px solid #e0e6ef;background:#fff;border-radius:9px;padding:7px 9px;font-size:9px;color:#657289;cursor:pointer}.email-filters button.active{background:#eef1ff;color:#5267e7;border-color:#d8ddff}.email-message-row{width:100%;display:grid;grid-template-columns:8px 1fr;gap:10px;border:0;border-top:1px solid #edf0f5;padding:12px 2px;background:#fff;text-align:left;color:inherit;cursor:pointer}.email-message-row:hover{background:#fafbff}.email-message-dot{width:7px;height:7px;border-radius:50%;margin-top:6px}.email-message-main{min-width:0}.email-message-top{display:flex;justify-content:space-between;gap:8px}.email-message-top b,.email-message-main>strong{font-size:10px}.email-message-row.unread .email-message-top b,.email-message-row.unread .email-message-main>strong{font-weight:800}.email-message-top span{font-size:8.5px;color:#929cad}.email-message-main p{font-size:9px;color:#778399;line-height:1.45;margin:5px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.email-meta{display:flex;gap:6px;flex-wrap:wrap;font-size:8px;color:#8994a7}.email-action-state{background:#fff4df;color:#a86d13;border-radius:20px;padding:2px 6px}.email-empty{text-align:center;padding:80px 30px;color:#8591a5}.email-empty>div{font-size:34px}.email-empty h3{font-size:14px;color:#33405a}.email-empty p{font-size:10px;line-height:1.5;max-width:390px;margin:auto}.email-modal-wrap{position:fixed;inset:0;z-index:9999;background:rgba(22,29,44,.42);backdrop-filter:blur(4px);display:grid;place-items:center;padding:20px}.email-message-modal{width:min(680px,94vw);max-height:86vh;overflow:auto;background:#fff;border-radius:18px;padding:21px;box-shadow:0 24px 80px rgba(20,29,50,.25)}.email-modal-head{display:flex;justify-content:space-between;gap:12px}.email-modal-head h3{font-size:17px;margin:5px 0}.email-modal-head button{border:0;background:#eef1f5;border-radius:8px;width:32px;height:32px;font-size:18px;cursor:pointer}.email-message-info{font-size:9px;color:#667389;line-height:1.65;border-bottom:1px solid #edf0f5;padding:10px 0}.email-message-body{font-size:10px;line-height:1.65;white-space:pre-wrap;padding:16px 0}.email-readonly-note{font-size:8.5px;color:#8a95a8;border-top:1px solid #edf0f5;padding-top:10px}.email-nav-icon{font-size:17px;line-height:1}
      @media(max-width:900px){#personalOsEmailOverlay{inset:0}.email-header{height:auto;padding:20px 16px}.email-content{padding:14px 12px 70px}.email-kpis{grid-template-columns:1fr 1fr}.email-grid{grid-template-columns:1fr}.email-accounts,.email-inbox{min-height:0}.email-header-actions{align-items:center}.email-account-row{grid-template-columns:32px minmax(0,1fr) 42px 70px}}
      `;document.head.appendChild(style);
    }

    function init(){
      ds=window.PersonalOSData;
      if(!ds)return false;
      addStyles();
      let tries=0;
      const timer=setInterval(()=>{tries++;if(ensureNav()||tries>60)clearInterval(timer);},500);
      return true;
    }

    if(!init()){
      let tries=0;
      const t=setInterval(()=>{tries++;if(init()||tries>60)clearInterval(t);},500);
    }
    window.PersonalOSEmailPatch={version:VERSION,open:showEmail,sync:()=>syncPrimeva(true)};
  } catch(e) {
    console.warn('Personal OS Email patch disabled safely',e);
  }
})();