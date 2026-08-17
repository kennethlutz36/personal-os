(()=>{
  if(!window.PersonalOSData||typeof state==='undefined') return;
  const ds=window.PersonalOSData;
  state.whoopStatus=state.whoopStatus||null;
  state.whoopAutoSyncing=false;
  const FN='https://moczyyqxcveqewvxjiph.supabase.co/functions/v1/whoop-oauth';
  const CALLBACK=FN;
  const SCOPES=['offline','read:recovery','read:cycles','read:sleep','read:workout','read:body_measurement'];

  async function callWhoop(action,payload={}){
    const {data:{session}}=await ds.client.auth.getSession();
    if(!session?.access_token) throw new Error('Sign in first');
    const r=await fetch(FN,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token,'apikey':'sb_publishable_Wj8Tjx_v0tvkcUcr3vvpgA_uQ3V4Vmn'},body:JSON.stringify({action,...payload})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok||data?.error) throw new Error(data?.error||`WHOOP request failed (${r.status})`);
    return data;
  }
  ds.whoopStatus=()=>callWhoop('status');
  ds.configureWhoop=(clientId,clientSecret)=>callWhoop('configure',{clientId,clientSecret});
  ds.startWhoop=()=>callWhoop('start');
  ds.syncWhoop=()=>callWhoop('sync');

  const priorRefresh=refreshFromSupabase;
  refreshFromSupabase=async function(){
    await priorRefresh();
    if(!ds.user) return;
    try{
      state.whoopStatus=await ds.whoopStatus();
      render();
      const i=state.whoopStatus?.integration;
      const tokenAuthorized=state.whoopStatus?.credentialMetadata?.authorized===true;
      const shouldSync=tokenAuthorized&&(i?.status!=='connected'||!i?.last_synced_at||Date.now()-new Date(i.last_synced_at).getTime()>15*60*1000);
      if(shouldSync&&!state.whoopAutoSyncing){
        state.whoopAutoSyncing=true;
        ds.syncWhoop().then(async()=>{
          state.whoopStatus=await ds.whoopStatus();
          await priorRefresh();
          render();
        }).catch(e=>console.warn('whoop auto-sync',e)).finally(()=>{state.whoopAutoSyncing=false});
      }
    }catch(e){console.warn('whoop status',e)}
  };

  const priorSettings=settingsPage;
  settingsPage=function(){
    const base=priorSettings();
    const ws=state.whoopStatus;
    const tokenAuthorized=ws?.credentialMetadata?.authorized===true;
    const connected=ws?.integration?.status==='connected'||tokenAuthorized;
    const configured=!!ws?.configured;
    let panel='';
    if(connected){
      const syncing=ws?.integration?.status!=='connected';
      const last=ws?.integration?.last_synced_at?new Date(ws.integration.last_synced_at).toLocaleString():(syncing?'Finishing initial sync…':'Ready');
      panel=`<article class="card card-pad"><div class="card-title"><div><h3>WHOOP</h3><div class="chart-sub">Recovery, HRV, RHR, sleep, strain and workouts · OAuth tokens stored server-side.</div></div><button class="secondary" id="whoopSync">↻ Sync now</button></div><div class="connect-card"><div><div class="connect-name">${syncing?'Authorized':'Connected'}</div><div class="connect-meta">${syncing?'WHOOP authorization succeeded · completing data sync':`Last synced ${last}`}</div></div><span class="tag"><span class="status-dot"></span>${syncing?'syncing':'connected'}</span></div><p class="hint" style="margin-top:12px">Personal OS refreshes WHOOP while the dashboard is open. Access and refresh tokens remain encrypted in Supabase Vault.</p></article>`;
    }else if(configured){
      panel=`<article class="card card-pad"><div class="card-title"><div><h3>AUTHORIZE WHOOP</h3><div class="chart-sub">Developer credentials are stored. Grant Personal OS access through WHOOP.</div></div><span class="tag">OAuth ready</span></div><button class="primary wide" id="whoopAuthorize" style="margin-top:14px">Authorize with WHOOP</button><p class="hint" style="margin-top:12px">WHOOP will open its own sign-in/consent screen and return you here after authorization.</p><details style="margin-top:14px"><summary class="hint" style="cursor:pointer">Replace developer credentials</summary><form id="whoopConfigForm" class="drawer-form" style="margin-top:12px"><label>Client ID</label><input id="whoopClientId" autocomplete="off"><label>Client Secret</label><input id="whoopClientSecret" type="password" autocomplete="new-password"><button class="secondary wide" type="submit">Save replacement credentials</button></form></details></article>`;
    }else{
      panel=`<article class="card card-pad"><div class="card-title"><div><h3>CONNECT WHOOP</h3><div class="chart-sub">Create a WHOOP Developer App once, then authorize your own WHOOP account.</div></div><span class="tag">Secure OAuth</span></div><div class="connect-card" style="display:block"><div class="connect-name">1. WHOOP Redirect URI</div><div class="connect-meta" style="margin:8px 0">Register this exact Redirect URI in the WHOOP Developer Dashboard:</div><div style="display:flex;gap:8px"><input id="whoopCallback" readonly value="${CALLBACK}" style="flex:1"><button class="secondary" id="copyWhoopCallback">Copy</button></div></div><div class="connect-card" style="display:block"><div class="connect-name">2. Scopes</div><div class="connect-meta" style="margin-top:8px">${SCOPES.join(' · ')}</div></div><form id="whoopConfigForm" class="drawer-form" style="margin-top:14px"><label>WHOOP Client ID</label><input id="whoopClientId" autocomplete="off" placeholder="Client ID from WHOOP Developer Dashboard"><label>WHOOP Client Secret</label><input id="whoopClientSecret" type="password" autocomplete="new-password" placeholder="Stored encrypted after submit"><button class="primary wide" type="submit">Save WHOOP developer app</button><p class="hint">The Client Secret is submitted directly to the authenticated backend, encrypted in Vault, cleared from this form, and never written to GitHub or local storage.</p></form></article>`;
    }
    return base+`<div style="margin-top:14px">${panel}</div>`;
  };

  const priorBind=bind;
  bind=function(){
    priorBind();
    const cp=document.getElementById('copyWhoopCallback');
    if(cp)cp.onclick=async()=>{await navigator.clipboard.writeText(CALLBACK);toast('WHOOP redirect URI copied')};
    const form=document.getElementById('whoopConfigForm');
    if(form)form.onsubmit=async e=>{e.preventDefault();const btn=form.querySelector('button[type=submit]');const id=document.getElementById('whoopClientId')?.value.trim();const secret=document.getElementById('whoopClientSecret')?.value.trim();if(!id||!secret){toast('Enter the WHOOP Client ID and Client Secret.');return;}btn.disabled=true;btn.textContent='Saving…';try{await ds.configureWhoop(id,secret);document.getElementById('whoopClientSecret').value='';toast('WHOOP developer app saved securely');state.whoopStatus=await ds.whoopStatus();render();}catch(err){toast(err.message||'WHOOP setup failed');btn.disabled=false;btn.textContent='Save WHOOP developer app';}};
    const auth=document.getElementById('whoopAuthorize');
    if(auth)auth.onclick=async()=>{auth.disabled=true;auth.textContent='Opening WHOOP…';try{const d=await ds.startWhoop();location.assign(d.authorizationUrl);}catch(err){toast(err.message||'Unable to start WHOOP authorization');auth.disabled=false;auth.textContent='Authorize with WHOOP';}};
    const sync=document.getElementById('whoopSync');
    if(sync)sync.onclick=async()=>{sync.disabled=true;sync.textContent='Syncing…';try{const d=await ds.syncWhoop();toast(`WHOOP synced · ${d.daily||0} daily records · ${d.workouts||0} workouts`);await refreshFromSupabase();}catch(err){toast(err.message||'WHOOP sync failed');sync.disabled=false;sync.textContent='↻ Sync now';}};
  };

  const qp=new URLSearchParams(location.search); const result=qp.get('whoop');
  if(result){
    setTimeout(()=>{if(result==='connected')toast('WHOOP connected and initial data synced');else if(result==='invalid_state')toast('WHOOP authorization expired. Start authorization again.');else toast('WHOOP authorization completed but the initial sync needs a retry.');},500);
    history.replaceState({},'',location.pathname+location.hash);
  }
  refreshFromSupabase().catch(e=>console.warn(e));
})();
