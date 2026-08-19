(()=>{'use strict';
if(window.__calendarLayoutV2)return;window.__calendarLayoutV2=1;
const PRIMEVA_AREAS=new Set(['Primeva Health','Primeva Labs']);
let lastRoute='',lastNormalized=0;
function isPrimevaTask(t){return t&&String(t.source_system||'').toLowerCase()==='primeva'&&PRIMEVA_AREAS.has(String(t.area||''));}
function normalizeTasks(rows){if(!Array.isArray(rows))return false;let changed=false;for(const t of rows){if(!isPrimevaTask(t)||!t.due_at)continue;if(!Object.prototype.hasOwnProperty.call(t,'__pos_original_due_at'))Object.defineProperty(t,'__pos_original_due_at',{value:t.due_at,writable:true,configurable:true,enumerable:false});t.due_at=null;changed=true;}return changed;}
function dedupeEvents(){const V=window.PersonalOSV2;if(!Array.isArray(V?.events)||V.events.length<2)return false;const seen=new Set(),out=[];for(const e of V.events){if(String(e?.source_system||'')!=='apple_calendar'){out.push(e);continue;}const key=[e.source_calendar||e.area||'',e.title||'',e.starts_at||'',e.ends_at||'',e.location||'',e.all_day?'1':'0'].join('|');if(seen.has(key))continue;seen.add(key);out.push(e);}if(out.length===V.events.length)return false;V.events=out;return true;}
function normalize(){let changed=false;const V=window.PersonalOSV2;changed=normalizeTasks(V?.externalTasks)||changed;changed=normalizeTasks(window.state?.externalTasks)||changed;changed=normalizeTasks(window.state?.tasks)||changed;changed=dedupeEvents()||changed;return changed;}
function rerenderOverview(){try{if(String(window.state?.route||'')!=='overview')return;if(typeof render==='function')render();}catch(e){console.warn('Calendar layout overview rerender skipped',e);}}
function enhance(){const route=String(window.state?.route||'');const changed=normalize();if(changed&&route==='overview'&&Date.now()-lastNormalized>600){lastNormalized=Date.now();setTimeout(rerenderOverview,0);}if(route!==lastRoute){lastRoute=route;normalize();}}
const style=document.createElement('style');style.id='calendarLayoutV2Style';style.textContent=`
/* Calendar v2: make time the visual framework, not tiny metadata. */
.poscal-timeline{border:1px solid #dde4ee!important;border-radius:16px!important;overflow:auto!important;background:#fff!important;box-shadow:0 8px 28px rgba(45,58,84,.045)!important}
.poscal-dayheads{position:sticky!important;top:0!important;z-index:12!important;background:#fff!important;border-bottom:1px solid #dfe6ef!important}
.poscal-dayheads>div:not(:first-child){padding:10px 8px!important;min-height:42px!important}
.poscal-dayheads b{font-size:10px!important;letter-spacing:.08em!important;color:#66758c!important}
.poscal-dayheads span{font-size:17px!important;font-weight:850!important;color:#17243a!important}
.poscal-timebody{background:#fff!important}
.poscal-times{background:#f8fafc!important;border-right:1px solid #dfe6ef!important;z-index:5!important}
.poscal-times span{font-size:12px!important;font-weight:800!important;color:#52627a!important;letter-spacing:-.01em!important;padding-right:7px!important;white-space:nowrap!important}
.poscal-daycol{border-right:1px solid #e4e9f1!important;background-color:#fff!important;background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 21px,rgba(211,219,231,.48) 21px,rgba(211,219,231,.48) 22px),repeating-linear-gradient(to bottom,transparent 0,transparent 43px,rgba(174,187,205,.72) 43px,rgba(174,187,205,.72) 44px)!important}
.poscal-daycol.today{background-color:#fbfcff!important}
.poscal-eventwrap{padding:2px 3px!important;box-sizing:border-box!important}
.poscal-event{height:100%!important;box-sizing:border-box!important;padding:5px 7px!important;border-radius:8px!important;border-left-width:4px!important;box-shadow:0 2px 7px rgba(36,49,72,.06)!important;overflow:hidden!important}
.poscal-event b{font-size:11px!important;font-weight:800!important;line-height:1.2!important;color:#26354d!important}
.poscal-event span{font-size:10px!important;font-weight:750!important;line-height:1.2!important;color:#5c6e87!important;margin-top:3px!important}
.poscal-allday{background:#f8fafc!important;border-bottom:1px solid #dde4ee!important}
.poscal-allday>div:first-child{font-size:10px!important;font-weight:850!important;color:#69778c!important}
@media(max-width:900px){.poscal-times span{font-size:11px!important}.poscal-event b{font-size:10px!important}.poscal-event span{font-size:9px!important}.poscal-dayheads span{font-size:15px!important}}
`;
document.head.appendChild(style);
setInterval(enhance,350);setTimeout(()=>{enhance();if(String(window.state?.route||'')==='overview')rerenderOverview();},900);
window.addEventListener('focus',enhance);document.addEventListener('visibilitychange',()=>{if(!document.hidden)enhance()});
})();