(()=>{
  if(!window.PersonalOSData||typeof state==='undefined') return;
  const ds=window.PersonalOSData;
  const avg=(rows,key)=>{const v=rows.map(x=>Number(x?.[key])).filter(Number.isFinite);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null};
  const pct=(now,base)=>base&&Number.isFinite(now)?((now-base)/base)*100:null;
  const fmtDelta=(v,unit='%',inverse=false)=>{if(v==null||!Number.isFinite(v))return '—';const sign=v>0?'+':'';return `${sign}${v.toFixed(0)}${unit}`};

  ds.syncWhoopWorkouts=async()=>{
    const {data,error}=await ds.client.functions.invoke('whoop-workouts',{body:{}});
    if(error) throw error;
    if(data?.error) throw new Error(data.error);
    return data;
  };
  ds.addSupplement=async(name,reminderTime)=>{
    const u=await ds.auth(); if(!u) throw new Error('Sign in first');
    const row={user_id:u.id,name:String(name).trim(),active:true,reminder_enabled:!!reminderTime,reminder_time:reminderTime||null,calendar_area:'Personal'};
    const {error}=await ds.client.from('supplements').insert(row); if(error) throw error;
  };

  function buildHealthBrief(){
    const rows=state.healthDaily.filter(x=>x.source_system==='whoop').slice().sort((a,b)=>String(a.metric_date).localeCompare(String(b.metric_date)));
    const h=rows[rows.length-1]||liveHealth();
    if(!h) return {headline:'Waiting for WHOOP data.',detail:'Once WHOOP data is available, Personal OS will compare today with your recent baseline.',baseline:'No baseline yet'};
    const prior=rows.filter(x=>x!==h&&x.recovery_score!=null).slice(-5);
    const br=avg(prior,'recovery_score'), bh=avg(prior,'hrv_ms'), bhr=avg(prior,'resting_hr'), bs=avg(prior,'sleep_hours'), bst=avg(prior,'strain');
    const rec=Number(h.recovery_score), hrv=Number(h.hrv_ms), rhr=Number(h.resting_hr), sleep=Number(h.sleep_hours), strain=Number(h.strain);
    let headline='WHOOP signals are close to your recent baseline.';
    if(Number.isFinite(rec)&&rec>=80 && (!bh||hrv>=bh) && (!bhr||rhr<=bhr)) headline='Recovery signals are strong relative to your recent baseline.';
    else if(Number.isFinite(rec)&&rec<50) headline='Recovery is meaningfully below your recent baseline today.';
    else if(br&&rec>=br+10) headline='Recovery is running above your recent baseline today.';
    else if(br&&rec<=br-10) headline='Recovery is running below your recent baseline today.';
    const parts=[];
    if(br&&Number.isFinite(rec)) parts.push(`Recovery ${Math.round(rec)}% vs ${Math.round(br)}% recent avg`);
    if(bh&&Number.isFinite(hrv)) parts.push(`HRV ${Math.round(hrv)} ms (${fmtDelta(pct(hrv,bh))} vs avg)`);
    if(bhr&&Number.isFinite(rhr)) parts.push(`RHR ${Math.round(rhr)} bpm (${fmtDelta(pct(rhr,bhr))} vs avg)`);
    if(bs&&Number.isFinite(sleep)) parts.push(`Sleep ${sleep.toFixed(1)}h vs ${bs.toFixed(1)}h avg`);
    if(bst&&Number.isFinite(strain)) parts.push(`Strain ${strain.toFixed(1)} so far vs ${bst.toFixed(1)} recent avg`);
    let action='Use the physiological signals as context for today’s plan rather than as a standalone training prescription.';
    if(Number.isFinite(rec)&&rec>=80&&bh&&hrv>=bh&&bhr&&rhr<=bhr) action='Your readiness markers are favorable; current strain is still context-dependent, so scale training to the session you actually planned.';
    if(Number.isFinite(rec)&&rec<50) action='Keep today’s workload flexible and use symptoms, soreness, and planned training demands alongside the wearable data.';
    return {headline,detail:parts.join(' · '),baseline:prior.length?`Compared with ${prior.length} prior scored WHOOP days`:'Building baseline',action};
  }

  const priorHealth=healthPage;
  healthPage=function(){
    const h=liveHealth();
    const hp=state.healthDaily.slice().sort((a,b)=>String(a.metric_date).localeCompare(String(b.metric_date)));
    const recVals=hp.slice(-14).map(x=>Number(x.recovery_score||0));
    const brief=buildHealthBrief();
    return `<div class="section-stack"><div class="panel-head"><div><h2>Health Command Center</h2><div style="font-size:10px;color:#8c96a8">WHOOP + food + workouts + supplements, with Personal OS pattern review.</div></div><span class="tag">${h?'Health data live':'WHOOP authorization needed'}</span></div><div class="health-hero"><article class="card card-pad"><div class="card-title"><h3>TODAY'S PHYSIOLOGICAL STATE</h3><span class="tag">${h?.source_system||'Not connected'}</span></div><div style="display:grid;grid-template-columns:135px 1fr;gap:14px;align-items:center"><div class="recovery-ring" style="background:conic-gradient(#38ae76 0 ${h?.recovery_score||0}%,#edf0f4 ${h?.recovery_score||0}%)"><div style="text-align:center"><strong>${h?.recovery_score!=null?Math.round(h.recovery_score)+'%':'—'}</strong><span>Recovery</span></div></div><div class="signal-kpis" style="margin:0"><div class="signal-kpi"><span>Sleep</span><strong>${h?.sleep_hours!=null?Number(h.sleep_hours).toFixed(1)+'h':'—'}</strong></div><div class="signal-kpi"><span>HRV</span><strong>${h?.hrv_ms!=null?Math.round(h.hrv_ms)+' ms':'—'}</strong></div><div class="signal-kpi"><span>RHR</span><strong>${h?.resting_hr!=null?Math.round(h.resting_hr)+' bpm':'—'}</strong></div><div class="signal-kpi"><span>Strain</span><strong>${h?.strain!=null?Number(h.strain).toFixed(1):'—'}</strong></div><div class="signal-kpi"><span>Food logs</span><strong>${state.foodLogs.length}</strong></div><div class="signal-kpi"><span>Workouts</span><strong>${state.workoutLogs.length}</strong></div></div></div></article><article class="card card-pad"><div class="card-title"><h3>AI HEALTH REVIEW</h3><span class="tag">WHOOP-derived</span></div><div class="ai-mini"><b>${brief.headline}</b> ${brief.detail||''}<div style="margin-top:8px">${brief.action||''}</div><div class="hint" style="margin-top:8px">${brief.baseline}. This is a Personal OS interpretation of WHOOP API metrics, not WHOOP Coach text.</div></div><div class="list-row"><span>Supplements configured</span><strong>${state.supplements.filter(s=>s.active).length}</strong></div><div class="list-row"><span>Food entries</span><strong>${state.foodLogs.length}</strong></div><div class="list-row"><span>Workout entries</span><strong>${state.workoutLogs.length}</strong></div></article></div><div class="grid grid-2"><article class="card chart-card"><div class="chart-title"><div><h3>RECOVERY TREND</h3><div class="chart-sub">Latest available daily WHOOP values</div></div><span class="tag">${hp.length} days</span></div>${sparkSvg(recVals.length?recVals:[0,0,0,0,0,0],'#21b69a')}</article><article class="card chart-card"><div class="chart-title"><div><h3>TRAINING / WORKOUT LOG</h3><div class="chart-sub">WHOOP sessions · 180-day backfill</div></div><button class="small-link" id="syncWhoopWorkouts">↻ WHOOP</button></div>${state.workoutLogs.slice(0,8).map(w=>`<div class="log-entry"><span>${w.title||w.workout_type}</span><strong>${w.duration_minutes?Math.round(w.duration_minutes)+'m':dateFmt(String(w.started_at||'').slice(0,10))}</strong></div>`).join('')||'<div class="hint">No WHOOP workouts imported yet. The backfill runs automatically.</div>'}</article></div><div class="log-grid"><article class="card card-pad"><div class="card-title"><h3>FOOD LOG</h3><button class="small-link" id="addMeal">＋ Meal</button></div>${state.foodLogs.slice(0,8).map(f=>`<div class="log-entry"><span>${f.meal_type?f.meal_type+' · ':''}${f.description}</span><strong>${f.protein_g?Math.round(f.protein_g)+'g protein':''}</strong></div>`).join('')||'<div class="hint">No meals logged yet.</div>'}</article><article class="card card-pad"><div class="card-title"><h3>DAILY SUPPLEMENT PLAN</h3><button class="small-link" id="addSupplement">＋ Supplement</button></div>${state.supplements.filter(s=>s.active).map(s=>`<div class="log-entry"><span>${s.name}${s.dose?' · '+s.dose+(s.unit||''):''}</span><strong>${s.reminder_time?String(s.reminder_time).slice(0,5):s.timing||'Flexible'}</strong></div>`).join('')||'<div class="hint">No supplements configured. Add only the items you want Personal OS to track.</div>'}</article></div></div>`;
  };

  const priorBind=bind;
  bind=function(){
    priorBind();
    const wb=document.getElementById('syncWhoopWorkouts');
    if(wb) wb.onclick=async()=>{wb.disabled=true;wb.textContent='Syncing…';try{const d=await ds.syncWhoopWorkouts();sessionStorage.setItem('pos_whoop_workout_sync',String(Date.now()));toast(`WHOOP workouts · ${d.workouts||0} imported`);await refreshFromSupabase();}catch(e){toast(e.message||'WHOOP workout sync failed');wb.disabled=false;wb.textContent='↻ WHOOP';}};
    const sp=document.getElementById('addSupplement');
    if(sp) sp.onclick=async()=>{const name=prompt('Supplement name');if(!name?.trim())return;const raw=(prompt('Reminder time in 24-hour HH:MM format, or leave blank for no reminder','')||'').trim();if(raw&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(raw)){toast('Use HH:MM, for example 08:00 or 21:30.');return;}try{await ds.addSupplement(name,raw||null);toast(raw?`Added ${name} · reminder ${raw}`:`Added ${name}`);await refreshFromSupabase();}catch(e){toast(e.message||'Unable to add supplement');}};
  };

  const priorRefresh=refreshFromSupabase;
  refreshFromSupabase=async function(){
    await priorRefresh();
    if(!ds.user) return;
    const last=Number(sessionStorage.getItem('pos_whoop_workout_sync')||0);
    if(Date.now()-last>30*60*1000){
      sessionStorage.setItem('pos_whoop_workout_sync',String(Date.now()));
      try{const d=await ds.syncWhoopWorkouts();if((d.workouts||0)!==state.workoutLogs.filter(w=>w.source_system==='whoop').length)await priorRefresh();}catch(e){console.warn('whoop workout backfill',e)}
    }
    render();
  };

  refreshFromSupabase().catch(e=>console.warn(e));
})();