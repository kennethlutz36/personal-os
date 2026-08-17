(()=>{
  if(!window.PersonalOSData||typeof state==='undefined') return;
  state.calendarSources=state.calendarSources||[];
  const ds=window.PersonalOSData;
  ds.connectApple=async(appleId,appPassword)=>{const {data,error}=await ds.client.functions.invoke('apple-calendar',{body:{action:'connect',appleId,appPassword}});if(error)throw error;if(data?.error)throw new Error(data.error);return data};
  ds.syncApple=async()=>{const {data,error}=await ds.client.functions.invoke('apple-calendar',{body:{action:'sync'}});if(error)throw error;if(data?.error)throw new Error(data.error);return data};
  ds.updateCalendarSource=async(id,area,enabled)=>{const u=await ds.auth();if(!u)throw new Error('Sign in first');const {error}=await ds.client.from('calendar_sources').update({area,enabled,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',u.id);if(error)throw error};

  const baseRefresh=refreshFromSupabase;
  refreshFromSupabase=async function(){
    await baseRefresh();
    if(!ds.user) return;
    try{
      const {data,error}=await ds.client.from('calendar_sources').select('*').order('source_calendar_name');
      if(error) throw error;
      state.calendarSources=data||[];
      render();
    }catch(e){console.warn('calendar_sources',e)}
  };

  settingsPage=function(){
    const p=provider=>integration(provider);
    const apple=p('apple_calendar');
    const appleConnected=apple?.status==='connected'||state.calendarSources.length>0;
    const con=[
      ['Three Rivers dashboard','Hourly read-only task/account sync into Personal OS.',p('three_rivers')?.status||'syncing'],
      ['Primeva systems',`${state.primevaAgents.length} Claude agents bridged; execution remains inside Primeva.`,p('primeva')?.status||'connected'],
      ['Apple / iCloud Calendar',appleConnected?`${state.calendarSources.length} iCloud calendars configured.`:'Direct calendar authorization required.',apple?.status||(appleConnected?'connected':'Authorization required')],
      ['WHOOP','OAuth required for recovery, sleep, strain and workout metrics.',p('whoop')?.status||'Authorization required'],
      ['Financial accounts',`${state.financeAccounts.length} linked accounts available in Personal OS.`,p('finances')?.status||'connected'],
      ['AI briefing','Uses connected tasks, approvals, finance and health state.',state.live?'Live data foundation':'Waiting for sign-in']
    ];
    const applePanel=appleConnected?`<article class="card card-pad"><div class="card-title"><div><h3>APPLE CALENDAR</h3><div class="chart-sub">Read-only iCloud sync · map each source calendar into a Personal OS area.</div></div><button class="secondary" id="appleSync">↻ Sync now</button></div>${state.calendarSources.map(c=>`<div class="connect-card"><div style="min-width:0"><div class="connect-name">${c.source_calendar_name}</div><div class="connect-meta">${c.last_synced_at?'Synced '+new Date(c.last_synced_at).toLocaleString():'Ready to sync'}</div></div><div style="display:flex;align-items:center;gap:8px"><select class="cal-area" data-cal-id="${c.id}" style="min-width:135px"><option ${c.area==='Personal'?'selected':''}>Personal</option><option ${c.area==='Three Rivers'?'selected':''}>Three Rivers</option><option ${c.area==='Primeva Labs'?'selected':''}>Primeva Labs</option><option ${c.area==='Primeva Health'?'selected':''}>Primeva Health</option></select><label class="tag" style="gap:6px"><input type="checkbox" class="cal-enabled" data-cal-id="${c.id}" ${c.enabled?'checked':''}> Sync</label></div></div>`).join('')||'<div class="hint">Calendar metadata is loading.</div>'}<p class="hint" style="margin-top:12px">Changes to calendar mapping apply on the next sync. Personal OS currently reads iCloud Calendar; it does not modify Apple Calendar events yet.</p></article>`:`<article class="card card-pad"><div class="card-title"><div><h3>CONNECT APPLE CALENDAR</h3><div class="chart-sub">Credentials are sent directly to the authenticated Supabase function and stored encrypted in Vault.</div></div><span class="tag">Secure setup</span></div><form id="appleConnectForm" class="drawer-form" style="margin-top:14px"><label>Apple Account email</label><input id="appleId" type="email" autocomplete="username" placeholder="you@icloud.com"><label>App-specific password</label><input id="appleAppPassword" type="password" autocomplete="new-password" placeholder="xxxx-xxxx-xxxx-xxxx"><button class="primary wide" type="submit">Connect & sync iCloud Calendar</button><p class="hint">Use an Apple <b>app-specific password</b>, not your normal Apple Account password. Generate one at account.apple.com → Sign-In and Security → App-Specific Passwords.</p></form></article>`;
    return `<div class="grid grid-2"><article class="card card-pad"><div class="card-title"><h3>INTEGRATIONS</h3></div>${con.map(([n,m,s])=>`<div class="connect-card"><div><div class="connect-name">${n}</div><div class="connect-meta">${m}</div></div><div class="tag"><span class="status-dot"></span>${s}</div></div>`).join('')}</article><article class="card card-pad"><div class="card-title"><h3>PRIMEVA AGENTS</h3></div>${state.primevaAgents.map(a=>`<div class="list-row"><span><b>${a.name}</b><br><small>${a.scope||''}${a.current_task?' · '+a.current_task:''}</small></span><span class="tag">${a.status||'ready'} · ${a.work_awaiting_review||0} review</span></div>`).join('')||'<div class="hint">Primeva agent definitions will appear after sync.</div>'}<p class="hint" style="margin-top:16px">Primeva remains reporting/approval-only from Personal OS. Outreach, publishing, approvals, and spending are never executed here.</p></article></div><div style="margin-top:14px">${applePanel}</div>`;
  };

  const baseBind=bind;
  bind=function(){
    baseBind();
    const af=document.getElementById('appleConnectForm');
    if(af)af.onsubmit=async e=>{e.preventDefault();const btn=af.querySelector('button[type=submit]');const appleId=document.getElementById('appleId').value.trim();const appPassword=document.getElementById('appleAppPassword').value.trim();if(!appleId||!appPassword){toast('Enter your Apple Account email and app-specific password.');return;}btn.disabled=true;btn.textContent='Connecting…';try{const d=await ds.connectApple(appleId,appPassword);document.getElementById('appleAppPassword').value='';toast(`Apple Calendar connected · ${d.events||0} events synced`);await refreshFromSupabase();}catch(err){toast(err.message||'Apple Calendar connection failed');btn.disabled=false;btn.textContent='Connect & sync iCloud Calendar';}};
    const as=document.getElementById('appleSync');
    if(as)as.onclick=async()=>{as.disabled=true;as.textContent='Syncing…';try{const d=await ds.syncApple();toast(`Synced ${d.events||0} Apple events`);await refreshFromSupabase();}catch(err){toast(err.message||'Calendar sync failed');as.disabled=false;as.textContent='↻ Sync now';}};
    document.querySelectorAll('.cal-area').forEach(sel=>sel.onchange=async()=>{const id=sel.dataset.calId;const chk=document.querySelector(`.cal-enabled[data-cal-id="${id}"]`);try{await ds.updateCalendarSource(id,sel.value,!!chk?.checked);toast('Calendar mapping saved');}catch(err){toast(err.message)}});
    document.querySelectorAll('.cal-enabled').forEach(chk=>chk.onchange=async()=>{const id=chk.dataset.calId;const sel=document.querySelector(`.cal-area[data-cal-id="${id}"]`);try{await ds.updateCalendarSource(id,sel?.value||'Personal',chk.checked);toast(chk.checked?'Calendar enabled':'Calendar paused');}catch(err){toast(err.message)}});
  };

  refreshFromSupabase().catch(e=>console.warn(e));
})();
