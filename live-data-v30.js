(()=>{
'use strict';
if(window.__personalOSLiveV30)return;window.__personalOSLiveV30=1;
const OWNER='kennethlutz36@gmail.com';
const POLL_MS=30000;
const c=()=>window.PersonalOSData?.client;
const V=()=>window.PersonalOSV2;
const locks=new Map();
let channel=null,pendingRender=false,lastRefresh=0;

function route(){try{return typeof state!=='undefined'?String(state.route||'overview'):'overview'}catch{return'overview'}}
function relevant(){const r=route();return ['overview','tasks','calendar'].includes(r)||!!document.querySelector('#content .v2-task-board,#content .v2-week')}
function editing(){const a=document.activeElement;if(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))return true;if(a?.isContentEditable)return true;return !!document.querySelector('#todo22Modal,#posV2Modal,.v2-modal-wrap,.todo22-modalwrap')}
function scheduleRender(){
  if(!relevant())return;
  if(editing()){pendingRender=true;return}
  pendingRender=false;
  try{if(typeof render==='function')render()}catch(e){console.warn('Personal OS live render',e)}
}
function sig(kind,rows){
  const keys=kind==='tasks'?['id','title','area','status','priority','due_date','due_at','notes','task_kind','updated_at','completed_at']:
    kind==='external_tasks'?['id','title','area','status','priority','due_date','due_at','notes','synced_at','external_id']:
    kind==='events'?['id','title','area','starts_at','ends_at','all_day','location','notes','source_system','source_calendar','external_id','updated_at','last_synced_at']:
    ['id','provider','source_calendar_id','source_calendar_name','area','enabled','read_only','last_synced_at','updated_at'];
  return (rows||[]).map(r=>keys.map(k=>String(r?.[k]??'')).join('\u001f')).join('\u001e');
}
function current(kind){const v=V();if(!v)return[];if(kind==='tasks')return v.localTasks||[];if(kind==='external_tasks')return v.externalTasks||[];if(kind==='events')return v.events||[];try{return typeof state!=='undefined'?(state.calendarSources||[]):[]}catch{return[]}}
function assign(kind,rows){const v=V();if(!v)return;if(kind==='tasks')v.localTasks=rows;else if(kind==='external_tasks')v.externalTasks=rows;else if(kind==='events')v.events=rows;else try{if(typeof state!=='undefined')state.calendarSources=rows}catch{}}
async function query(kind){
  const cl=c();if(!cl)throw new Error('Personal OS data client unavailable');
  const u=(await cl.auth.getUser()).data?.user;if(!u)throw new Error('Not signed in');
  if(kind==='tasks')return cl.from('tasks').select('*').eq('user_id',u.id).order('created_at',{ascending:false});
  if(kind==='external_tasks')return cl.from('external_tasks').select('*').eq('owner_email',OWNER).order('due_at',{ascending:true,nullsFirst:false});
  if(kind==='events')return cl.from('events').select('*').eq('user_id',u.id).order('starts_at',{ascending:true});
  return cl.from('calendar_sources').select('*').eq('user_id',u.id).order('source_calendar_name',{ascending:true});
}
async function one(kind){
  if(locks.get(kind))return false;
  locks.set(kind,true);
  try{
    const r=await query(kind);if(r.error)throw r.error;
    const rows=r.data||[],before=sig(kind,current(kind)),after=sig(kind,rows);
    if(before!==after){assign(kind,rows);return true}
    return false;
  }catch(e){console.warn('Personal OS live refresh',kind,e)}finally{locks.delete(kind)}
  return false;
}
async function refresh(kinds=['tasks','external_tasks','events','calendar_sources'],opts={}){
  const list=Array.isArray(kinds)?kinds:[kinds];
  const changed=(await Promise.all(list.map(one))).some(Boolean);
  lastRefresh=Date.now();
  if(changed&&opts.render!==false)scheduleRender();
  return changed;
}
function queue(kind){clearTimeout(queue.t);queue.t=setTimeout(()=>refresh([kind],{render:true}),120)}
function subscribe(){
  const cl=c();if(!cl?.channel||channel)return;
  try{
    channel=cl.channel('personal-os-live-v30')
      .on('postgres_changes',{event:'*',schema:'public',table:'tasks'},()=>queue('tasks'))
      .on('postgres_changes',{event:'*',schema:'public',table:'external_tasks'},()=>queue('external_tasks'))
      .on('postgres_changes',{event:'*',schema:'public',table:'events'},()=>queue('events'))
      .on('postgres_changes',{event:'*',schema:'public',table:'calendar_sources'},()=>queue('calendar_sources'))
      .subscribe(status=>{if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){try{cl.removeChannel(channel)}catch{}channel=null;setTimeout(subscribe,4000)}});
  }catch(e){console.warn('Personal OS realtime subscribe',e);channel=null}
}
function activeRefresh(){if(document.visibilityState!=='visible')return;if(!relevant())return;refresh(undefined,{render:true})}

document.addEventListener('focusout',()=>{if(pendingRender)setTimeout(()=>{if(!editing())scheduleRender()},100)},true);
window.addEventListener('focus',()=>{if(Date.now()-lastRefresh>5000)refresh(undefined,{render:true})});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&Date.now()-lastRefresh>5000)refresh(undefined,{render:true})});
setInterval(activeRefresh,POLL_MS);
setTimeout(()=>{subscribe();refresh(undefined,{render:true})},1200);
window.PersonalOSLiveV30={refresh,refreshAll:()=>refresh(undefined,{render:true}),status:()=>({realtime:!!channel,lastRefresh,pendingRender})};
})();