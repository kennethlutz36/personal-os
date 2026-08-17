(()=>{
  if(!window.PersonalOSData||typeof state==='undefined') return;
  const ds=window.PersonalOSData;

  // Settings should describe the actual architecture: three owned iCloud calendars
  // plus the Three Rivers calendar mirrored directly from the CRM feed.
  if(typeof settingsPage==='function'){
    const priorSettingsPage=settingsPage;
    settingsPage=function(){
      let html=priorSettingsPage();
      const threeRivers=typeof integration==='function'?integration('three_rivers'):null;
      const trStatus=threeRivers?.status||'connected';
      const trLast=threeRivers?.last_synced_at?` · ${new Date(threeRivers.last_synced_at).toLocaleString()}`:'';
      html=html.replace(/(\d+) iCloud calendars configured\./, '$1 iCloud calendars + Three Rivers direct feed.');
      const directRow=`<div class="connect-card"><div style="min-width:0"><div class="connect-name">Three Rivers</div><div class="connect-meta">Direct CRM calendar sync · hourly${trLast}</div></div><span class="tag"><span class="status-dot"></span>${trStatus}</span></div>`;
      const hint='<p class="hint" style="margin-top:12px">Changes to calendar mapping apply on the next sync.';
      if(html.includes(hint)) html=html.replace(hint,directRow+hint);
      return html;
    };
  }

  async function autoSyncApple(){
    if(!ds.user||typeof ds.syncApple!=='function') return;
    const apple=typeof integration==='function'?integration('apple_calendar'):null;
    if(!apple||apple.status!=='connected') return;
    const last=new Date(apple.last_synced_at||0).getTime();
    if(Number.isFinite(last)&&Date.now()-last<15*60*1000) return;
    if(window.__personalOSAppleSyncing) return;
    window.__personalOSAppleSyncing=true;
    try{
      await ds.syncApple();
      await refreshFromSupabase();
    }catch(e){
      console.warn('apple calendar auto-sync',e);
    }finally{
      window.__personalOSAppleSyncing=false;
    }
  }

  // Refresh once after initial data load, then every 15 minutes while the app is open.
  setTimeout(autoSyncApple,3000);
  if(!window.__personalOSAppleAutoTimer){
    window.__personalOSAppleAutoTimer=setInterval(autoSyncApple,15*60*1000);
  }
})();
