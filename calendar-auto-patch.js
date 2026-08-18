(()=>{
  'use strict';
  if(!window.PersonalOSData||typeof state==='undefined') return;
  const ds=window.PersonalOSData;
  const AUTO_MS=5*60*1000;
  const FOCUS_STALE_MS=90*1000;

  function sources(){
    return (state.calendarSources||[]).filter(c=>c.provider==='apple_calendar'&&c.enabled);
  }
  function latestSync(){
    const vals=sources().map(c=>new Date(c.last_synced_at||0).getTime()).filter(Number.isFinite);
    return vals.length?Math.max(...vals):0;
  }
  function fmtLast(ts){
    if(!ts)return'Not synced yet';
    const age=Math.max(0,Date.now()-ts);
    if(age<60e3)return'Just synced';
    if(age<3600e3)return`Synced ${Math.max(1,Math.round(age/60e3))}m ago`;
    return`Synced ${new Date(ts).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}`;
  }
  function setButtonState(syncing){
    const b=document.getElementById('appleCalendarRefresh');
    if(!b)return;
    b.disabled=!!syncing;
    b.textContent=syncing?'Refreshing…':'↻ Refresh Apple Calendar';
  }
  async function syncApple(force=false,notify=false){
    if(!ds.user||typeof ds.syncApple!=='function') return;
    const apple=typeof integration==='function'?integration('apple_calendar'):null;
    const connected=apple?.status==='connected'||sources().length>0;
    if(!connected)return;
    const last=latestSync()||new Date(apple?.last_synced_at||0).getTime();
    if(!force&&Number.isFinite(last)&&Date.now()-last<AUTO_MS)return;
    if(window.__personalOSAppleSyncing)return;
    window.__personalOSAppleSyncing=true;
    setButtonState(true);
    try{
      const result=await ds.syncApple();
      await refreshFromSupabase();
      if(notify&&typeof toast==='function')toast(`Apple Calendar refreshed · ${result?.events??'events updated'}`);
    }catch(e){
      console.warn('apple calendar sync',e);
      if(notify&&typeof toast==='function')toast(e?.message||'Apple Calendar refresh failed');
    }finally{
      window.__personalOSAppleSyncing=false;
      setButtonState(false);
      setTimeout(injectLiveBar,0);
    }
  }
  function injectLiveBar(){
    if(String(state.route||'')!=='calendar')return;
    const content=document.getElementById('content');
    if(!content)return;
    let bar=document.getElementById('appleCalendarLiveBar');
    if(!bar){
      bar=document.createElement('div');
      bar.id='appleCalendarLiveBar';
      bar.className='apple-cal-live';
      content.prepend(bar);
    }
    const src=sources();
    const names=src.map(c=>c.source_calendar_name).filter(Boolean);
    const last=latestSync();
    bar.innerHTML=`<div class="apple-cal-live-main"><span class="apple-live-dot"></span><div><b>Apple Calendar · Live iCloud view</b><small>${src.length} calendars · ${fmtLast(last)}</small></div></div><div class="apple-cal-pills">${names.map(n=>`<span>${String(n).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</span>`).join('')}</div><button id="appleCalendarRefresh">↻ Refresh Apple Calendar</button>`;
    const btn=document.getElementById('appleCalendarRefresh');
    if(btn)btn.onclick=()=>syncApple(true,true);
    setButtonState(!!window.__personalOSAppleSyncing);
  }

  const style=document.createElement('style');
  style.id='appleCalendarLiveStyle';
  style.textContent=`.apple-cal-live{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 12px;padding:10px 12px;background:#fff;border:1px solid #e1e7f0;border-radius:13px;box-shadow:0 5px 18px rgba(40,55,80,.04)}.apple-cal-live-main{display:flex;align-items:center;gap:8px;min-width:190px}.apple-cal-live-main b{display:block;font-size:11px;color:#1d2939}.apple-cal-live-main small{display:block;margin-top:2px;font-size:9px;color:#8793a7}.apple-live-dot{width:9px;height:9px;border-radius:50%;background:#19b56b;box-shadow:0 0 0 4px rgba(25,181,107,.12)}.apple-cal-pills{display:flex;gap:5px;flex-wrap:wrap;flex:1}.apple-cal-pills span{font-size:8.5px;font-weight:700;color:#59677d;background:#f4f6fa;border:1px solid #e5e9f0;border-radius:999px;padding:5px 7px}.apple-cal-live button{min-height:38px;border:1px solid #d8e0eb;background:#fff;color:#3f4d63;border-radius:10px;padding:8px 11px;font-size:9px;font-weight:800;cursor:pointer}.apple-cal-live button:disabled{opacity:.55;cursor:default}@media(max-width:700px){.apple-cal-live{padding:11px;margin:0 0 10px}.apple-cal-live-main{width:100%}.apple-cal-pills{width:100%;order:3}.apple-cal-live button{margin-left:auto;min-height:44px;font-size:12px}.apple-cal-live-main b{font-size:13px}.apple-cal-live-main small,.apple-cal-pills span{font-size:11px}}`;
  document.head.appendChild(style);

  // While Personal OS is open, keep iCloud close to live. Also refresh after returning to the app.
  setTimeout(()=>{injectLiveBar();syncApple(false,false)},2500);
  setInterval(()=>{injectLiveBar();syncApple(false,false)},AUTO_MS);
  window.addEventListener('focus',()=>{
    injectLiveBar();
    const last=latestSync();
    if(!last||Date.now()-last>FOCUS_STALE_MS)syncApple(true,false);
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'){
      injectLiveBar();
      const last=latestSync();
      if(!last||Date.now()-last>FOCUS_STALE_MS)syncApple(true,false);
    }
  });
  setInterval(injectLiveBar,1200);
})();
