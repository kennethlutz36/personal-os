(()=>{
  if(typeof state==='undefined') return;

  const SNAP='personal-os-brief-snapshot-v1';
  const now=()=>new Date();
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const done=t=>!!state.completed?.[t.id]||['done','completed','cancelled'].includes(String(t.status||'').toLowerCase());
  const activeTasks=()=>state.tasks.filter(t=>!done(t));
  const sourceOf=t=>String(t.sourceSystem||t.source_system||t.project||'').toLowerCase();
  const isPrimevaTask=t=>sourceOf(t)==='primeva'||(t.readOnly&&String(t.area||'').startsWith('Primeva'));
  const isThreeRivers=t=>sourceOf(t)==='three_rivers'||String(t.area||'')==='Three Rivers';
  const dueDate=t=>{
    if(t.dueAt){const d=new Date(t.dueAt);if(!isNaN(d))return d;}
    if(t.due){const d=new Date(String(t.due).slice(0,10)+'T17:00:00');if(!isNaN(d))return d;}
    return null;
  };
  const days=(d)=>d?((d.getTime()-now().getTime())/86400000):Infinity;
  const fmtDate=d=>d?d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}):'No date';
  const fmtTime=d=>d?d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):'';
  const avg=arr=>arr.length?arr.reduce((s,x)=>s+x,0)/arr.length:null;
  const num=v=>v==null||v===''?null:Number(v);
  const moneyBrief=v=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(v)||0);

  function healthSignal(){
    const rows=(state.healthDaily||[]).slice().sort((a,b)=>String(b.metric_date).localeCompare(String(a.metric_date)));
    const today=rows[0];
    if(!today) return {label:'No wearable data',detail:'WHOOP data has not loaded yet.',tone:'neutral'};
    const base=rows.slice(1,6).filter(x=>num(x.recovery_score)!=null);
    const bRec=avg(base.map(x=>num(x.recovery_score)).filter(x=>x!=null));
    const bHrv=avg(base.map(x=>num(x.hrv_ms)).filter(x=>x!=null));
    const bRhr=avg(base.map(x=>num(x.resting_hr)).filter(x=>x!=null));
    const rec=num(today.recovery_score),hrv=num(today.hrv_ms),rhr=num(today.resting_hr),sleep=num(today.sleep_hours),strain=num(today.strain);
    let label='Readiness mixed',tone='neutral';
    if(rec!=null&&bRec!=null){
      if(rec>=bRec+12) {label='Readiness above baseline';tone='good';}
      else if(rec<=bRec-12) {label='Readiness below baseline';tone='warn';}
      else label='Readiness near baseline';
    }
    const detail=[rec!=null?`Recovery ${Math.round(rec)}%${bRec!=null?` vs ${Math.round(bRec)}% recent avg`:''}`:null,hrv!=null?`HRV ${Math.round(hrv)}${bHrv!=null?` vs ${Math.round(bHrv)}`:''} ms`:null,rhr!=null?`RHR ${Math.round(rhr)}${bRhr!=null?` vs ${Math.round(bRhr)}`:''} bpm`:null,sleep!=null?`${sleep.toFixed(1)}h sleep`:null,strain!=null?`strain ${strain.toFixed(1)}`:null].filter(Boolean).join(' · ');
    return {label,detail,tone,recovery:rec,baselineRecovery:bRec};
  }

  function scheduleState(){
    const n=now();
    const events=(state.events||[]).map(e=>({...e,_s:new Date(e.starts_at),_e:new Date(e.ends_at||e.starts_at)})).filter(e=>!isNaN(e._s)&&e._e>=n).sort((a,b)=>a._s-b._s);
    const next36=events.filter(e=>e._s.getTime()<=n.getTime()+36*3600000).slice(0,8);
    const conflicts=[];
    for(let i=0;i<next36.length;i++) for(let j=i+1;j<next36.length;j++){
      if(next36[j]._s < next36[i]._e && next36[j]._e > next36[i]._s) conflicts.push([next36[i],next36[j]]);
    }
    return {events:next36,conflicts};
  }

  function financeSignal(){
    const today=new Date(); today.setHours(0,0,0,0);
    const soon=(state.recurringFinance||[]).map(x=>({x,d:x.predicted_next_date?new Date(String(x.predicted_next_date).slice(0,10)+'T12:00:00'):null,amt:Number(x.last_amount??x.average_amount??0)})).filter(o=>o.d&&!isNaN(o.d)&&o.d>=today&&o.d.getTime()<=today.getTime()+7*86400000&&o.amt>=100).sort((a,b)=>a.d-b.d);
    const dueLiab=(state.liabilities||[]).map(x=>({x,d:x.next_payment_due_date?new Date(String(x.next_payment_due_date).slice(0,10)+'T12:00:00'):null,amt:Number(x.minimum_payment_amount??x.next_monthly_payment??0)})).filter(o=>o.d&&!isNaN(o.d)&&o.d>=today&&o.d.getTime()<=today.getTime()+7*86400000).sort((a,b)=>a.d-b.d);
    const item=dueLiab[0]||soon[0];
    if(!item) return {label:'No material 7-day finance exception',detail:'No tracked bill or liability above the brief threshold is due in the next 7 days.'};
    const x=item.x; const name=x.merchant_name||x.loan_name||x.account_name||x.description||'Payment';
    return {label:`${esc(name)} · ${moneyBrief(item.amt)}`,detail:`Expected ${fmtDate(item.d)}. Verify against the Finance page before acting.`};
  }

  function approvalsState(){
    const ap=(state.primevaApprovals||[]).filter(a=>String(a.state||'pending').toLowerCase()==='pending');
    const counts=ap.reduce((m,a)=>{const b=String(a.brand||'shared').toLowerCase();m[b]=(m[b]||0)+1;return m;},{});
    return {items:ap,counts};
  }

  function responseItems(){
    const waiting=activeTasks().filter(t=>String(t.status||'').toLowerCase()==='waiting'&&!isPrimevaTask(t)).slice(0,5);
    const aps=approvalsState().items.slice(0,4);
    return {waiting,approvals:aps};
  }

  function rankedActions(){
    const n=now();
    const candidates=[];
    const aps=approvalsState();
    if(aps.items.length){
      const parts=[]; if(aps.counts.health)parts.push(`${aps.counts.health} Health`); if(aps.counts.labs)parts.push(`${aps.counts.labs} Labs`); if(aps.counts.shared)parts.push(`${aps.counts.shared} shared`);
      candidates.push({score:115,title:`Review ${aps.items.length} Primeva approval${aps.items.length===1?'':'s'}`,meta:`${parts.join(' · ')} · review only; nothing sends automatically`,area:'Primeva',kind:'approval'});
    }
    const seen=new Set();
    for(const t of activeTasks().filter(t=>!isPrimevaTask(t))){
      const key=String(t.title||'').trim().toLowerCase(); if(!key||seen.has(key))continue; seen.add(key);
      const d=dueDate(t),dd=days(d); let score=15;
      if(t.priority==='P1')score+=55; else if(t.priority==='P2')score+=25;
      if(dd<0)score+=55; else if(dd<=1)score+=45; else if(dd<=3)score+=30; else if(dd<=7)score+=15;
      if(isThreeRivers(t))score+=8;
      if(String(t.status||'').toLowerCase()==='waiting')score-=20;
      candidates.push({score,title:t.title,meta:`${t.area||'Personal'}${d?' · '+(dd<0?'overdue · ':'')+fmtDate(d)+(t.dueAt?' '+fmtTime(d):''):''}`,area:t.area,kind:'task',task:t});
    }
    const sched=scheduleState();
    for(const e of sched.events.slice(0,3)){
      const hrs=(e._s-n)/3600000; let score=hrs<=4?70:hrs<=12?55:hrs<=24?40:20;
      candidates.push({score,title:`Prepare for ${e.title}`,meta:`${e.area||'Calendar'} · ${fmtDate(e._s)} ${fmtTime(e._s)}`,area:e.area,kind:'event'});
    }
    candidates.sort((a,b)=>b.score-a.score);
    const chosen=[]; const titles=new Set();
    for(const c of candidates){const k=c.title.toLowerCase();if(titles.has(k))continue;titles.add(k);chosen.push(c);if(chosen.length===3)break;}
    return chosen;
  }

  function neglected(){
    const ts=activeTasks().filter(t=>!isPrimevaTask(t));
    const overdue=ts.filter(t=>{const d=dueDate(t);return d&&d<now();});
    const undated=ts.filter(t=>!dueDate(t));
    const waiting=ts.filter(t=>String(t.status||'').toLowerCase()==='waiting');
    return {overdue,undated,waiting};
  }

  function snapshot(){
    const a=approvalsState(),h=healthSignal(),s=scheduleState();
    return {tasks:activeTasks().filter(t=>!isPrimevaTask(t)).length,approvals:a.items.length,threeRivers:activeTasks().filter(isThreeRivers).length,nextEvent:s.events[0]?.title||null,recovery:h.recovery??null,finance:financeSignal().label};
  }
  function changeLine(){
    const cur=snapshot(); let prev=null; try{prev=JSON.parse(localStorage.getItem(SNAP)||'null')}catch{}
    const changes=[];
    if(prev){
      if(cur.approvals!==prev.approvals)changes.push(`Primeva approvals ${prev.approvals} → ${cur.approvals}`);
      if(cur.tasks!==prev.tasks)changes.push(`open non-Primeva tasks ${prev.tasks} → ${cur.tasks}`);
      if(cur.threeRivers!==prev.threeRivers)changes.push(`Three Rivers ${prev.threeRivers} → ${cur.threeRivers}`);
      if(cur.nextEvent!==prev.nextEvent&&cur.nextEvent)changes.push(`next calendar item is now “${cur.nextEvent}”`);
      if(cur.recovery!=null&&prev.recovery!=null&&Math.round(cur.recovery)!==Math.round(prev.recovery))changes.push(`recovery ${Math.round(prev.recovery)}% → ${Math.round(cur.recovery)}%`);
    }
    try{localStorage.setItem(SNAP,JSON.stringify(cur))}catch{}
    return changes.length?changes.slice(0,3).join(' · '):prev?'No major brief-state change since your last review.':'Baseline created; future briefs will call out what changed.';
  }

  function briefData(){
    return {actions:rankedActions(),schedule:scheduleState(),health:healthSignal(),finance:financeSignal(),responses:responseItems(),neglected:neglected(),approvals:approvalsState(),changed:changeLine()};
  }

  function actionRows(actions){return actions.length?actions.map((a,i)=>`<div class="brief-action"><b>${i+1}. ${esc(a.title)}</b><span>${esc(a.meta)}</span></div>`).join(''):'<div class="brief-action"><b>No urgent action detected</b><span>Use Tasks or Quick Add to add what matters next.</span></div>'}

  function updateOverviewCard(){
    if(state.route!=='overview')return;
    const card=document.querySelector('article.command'); if(!card)return;
    const b=briefData();
    const overdue=b.neglected.overdue.length, waiting=b.neglected.waiting.length;
    card.innerHTML=`<div class="card-title"><div><h3>AI COMMAND BRIEF</h3><div class="chart-sub">Live ranking from tasks, calendar, Primeva approvals, WHOOP and finance.</div></div><button class="small-link" id="recalcBrief">Open full brief →</button></div>
      <div class="command-grid-v2">
        <div class="brief-block"><div class="section-label">BEST ORDER OF ATTACK</div><div class="brief-actions">${actionRows(b.actions)}</div></div>
        <div class="brief-block"><div class="section-label">WATCHLIST</div><div class="brief-chip-row"><span class="brief-chip">${b.approvals.items.length} Primeva approvals</span><span class="brief-chip">${waiting} waiting</span><span class="brief-chip">${overdue} overdue</span><span class="brief-chip">${b.schedule.conflicts.length} schedule conflicts</span><span class="brief-chip">${esc(b.health.label)}</span></div><div class="meta" style="margin-top:8px">${esc(b.changed)}</div></div>
        <div class="brief-block"><div class="section-label">TODAY / NEXT</div><div class="brief-metric-grid"><div class="brief-metric"><span>Next 36h events</span><strong>${b.schedule.events.length}</strong></div><div class="brief-metric"><span>Three Rivers</span><strong>${activeTasks().filter(isThreeRivers).length}</strong></div><div class="brief-metric"><span>Approvals</span><strong>${b.approvals.items.length}</strong></div><div class="brief-metric"><span>Recovery</span><strong class="${b.health.tone==='good'?'metric-good':''}">${b.health.recovery!=null?Math.round(b.health.recovery)+'%':'—'}</strong></div></div></div>
      </div>`;
  }

  function ensureStyles(){if(document.getElementById('briefPatchStyles'))return;const s=document.createElement('style');s.id='briefPatchStyles';s.textContent=`
    .brief-overlay{position:fixed;inset:0;background:rgba(21,28,45,.35);backdrop-filter:blur(4px);z-index:9998;display:flex;justify-content:flex-end}
    .brief-panel{width:min(640px,94vw);height:100%;overflow:auto;background:#f7f9fc;box-shadow:-20px 0 60px rgba(26,37,62,.18);padding:22px}
    .brief-panel-head{position:sticky;top:-22px;background:#f7f9fc;z-index:2;padding:18px 0 12px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border-bottom:1px solid #e5e9f1}
    .brief-panel h2{margin:2px 0 4px;font-size:22px}.brief-sub{font-size:11px;color:#7d889b}.brief-section{background:#fff;border:1px solid #e5e9f1;border-radius:16px;padding:15px;margin-top:12px;box-shadow:0 6px 18px rgba(35,45,74,.04)}
    .brief-section h4{font-size:10px;letter-spacing:.09em;margin:0 0 10px;color:#69758a}.brief-line{display:flex;gap:10px;padding:9px 0;border-top:1px solid #eef1f5}.brief-line:first-of-type{border-top:0}.brief-line b{font-size:11px}.brief-line small{display:block;color:#7e899a;margin-top:3px;line-height:1.45}.brief-n{width:22px;height:22px;border-radius:7px;background:#5b6fee;color:#fff;display:grid;place-items:center;font-size:10px;flex:0 0 22px}.brief-good{background:#edf9f3;border-color:#d3efdf}.brief-warn{background:#fff8ed;border-color:#f3e0ba}.brief-panel-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.brief-close{border:0;background:#eef1f7;width:32px;height:32px;border-radius:10px;cursor:pointer;font-size:18px}
  `;document.head.appendChild(s)}

  function openBrief(mode='brief'){
    if(!state.live){toast('Sign in and let Personal OS finish syncing first.');return;}
    ensureStyles(); document.getElementById('liveBriefOverlay')?.remove();
    const b=briefData(); const root=document.createElement('div');root.id='liveBriefOverlay';root.className='brief-overlay';
    const schedule=b.schedule.events.slice(0,5).map(e=>`<div class="brief-line"><div class="brief-n">•</div><div><b>${esc(e.title)}</b><small>${esc(e.area||'Calendar')} · ${fmtDate(e._s)} ${fmtTime(e._s)}${e._e?`–${fmtTime(e._e)}`:''}</small></div></div>`).join('')||'<div class="brief-sub">No upcoming calendar events in the next 36 hours.</div>';
    const responses=[...b.responses.approvals.slice(0,3).map(a=>({title:a.title,meta:`Primeva ${a.brand||'shared'} · approval required · no send from Personal OS`})),...b.responses.waiting.slice(0,3).map(t=>({title:t.title,meta:`${t.area||'Task'} · waiting`}))].slice(0,5);
    const respHtml=responses.length?responses.map(x=>`<div class="brief-line"><div class="brief-n">!</div><div><b>${esc(x.title)}</b><small>${esc(x.meta)}</small></div></div>`).join(''):'<div class="brief-sub">No response/approval item is currently elevated.</div>';
    const risk=b.schedule.conflicts.length?`${b.schedule.conflicts.length} overlapping calendar pair${b.schedule.conflicts.length===1?'':'s'} detected in the next 36h.`:'No calendar overlap detected in the next 36h.';
    root.innerHTML=`<section class="brief-panel"><div class="brief-panel-head"><div><div class="section-label">${mode==='start'?'START DAY':'LIVE AI BRIEF'}</div><h2>${mode==='start'?'Your operating sequence':'What matters now'}</h2><div class="brief-sub">Generated ${new Date().toLocaleString()} · source data stays read-only where required.</div></div><button class="brief-close" id="briefClose">×</button></div>
      <div class="brief-section"><h4>TOP 3</h4>${b.actions.map((a,i)=>`<div class="brief-line"><div class="brief-n">${i+1}</div><div><b>${esc(a.title)}</b><small>${esc(a.meta)}</small></div></div>`).join('')}</div>
      <div class="brief-section"><h4>SCHEDULE / RISK</h4>${schedule}<div class="brief-sub" style="margin-top:9px">${esc(risk)}</div></div>
      <div class="brief-section"><h4>RESPONSES & APPROVALS</h4>${respHtml}</div>
      <div class="brief-section ${b.health.tone==='good'?'brief-good':b.health.tone==='warn'?'brief-warn':''}"><h4>WHOOP READINESS</h4><b style="font-size:13px">${esc(b.health.label)}</b><div class="brief-sub" style="margin-top:6px">${esc(b.health.detail)}</div></div>
      <div class="brief-section"><h4>FINANCE EXCEPTION</h4><b style="font-size:12px">${b.finance.label}</b><div class="brief-sub" style="margin-top:6px">${esc(b.finance.detail)}</div></div>
      <div class="brief-section"><h4>NEGLECTED / CHANGED</h4><div class="brief-sub">${b.neglected.overdue.length} overdue · ${b.neglected.waiting.length} waiting · ${b.neglected.undated.length} undated non-Primeva items.</div><div class="brief-sub" style="margin-top:7px">${esc(b.changed)}</div></div>
      <div class="brief-panel-actions"><button class="primary" id="briefTasks">Open Tasks</button><button class="secondary" id="briefCalendar">Open Calendar</button><button class="secondary" id="briefRefresh">↻ Refresh live data</button></div>
    </section>`;
    document.body.appendChild(root);
    const close=()=>root.remove(); root.onclick=e=>{if(e.target===root)close()};root.querySelector('#briefClose').onclick=close;
    root.querySelector('#briefTasks').onclick=()=>{close();state.route='tasks';render()};root.querySelector('#briefCalendar').onclick=()=>{close();state.route='calendar';render()};
    root.querySelector('#briefRefresh').onclick=async()=>{const btn=root.querySelector('#briefRefresh');btn.disabled=true;btn.textContent='Refreshing…';try{await refreshFromSupabase();close();openBrief(mode)}catch(e){toast(e.message||'Refresh failed');btn.disabled=false;btn.textContent='↻ Refresh live data'}};
  }

  const prevBind=bind;
  bind=function(){prevBind();updateOverviewCard();const rec=document.getElementById('recalcBrief');if(rec)rec.onclick=()=>openBrief('brief');const ab=document.getElementById('aiBriefBtn');if(ab)ab.onclick=()=>openBrief('brief');const sd=document.getElementById('startDayBtn');if(sd)sd.onclick=()=>openBrief('start');};
  const ai=document.getElementById('aiBriefBtn'); if(ai)ai.onclick=()=>openBrief('brief');
  const start=document.getElementById('startDayBtn'); if(start)start.onclick=()=>openBrief('start');
  if(typeof render==='function')render();
})();
