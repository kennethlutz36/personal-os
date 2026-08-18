(()=>{
  if(typeof state==='undefined'||!window.PersonalOSData)return;
  const ds=window.PersonalOSData;
  let accounts=[],messages=[],filter='all',overlay=null;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=d=>d?new Date(d).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'Never';
  const providerLabel=p=>({hostinger:'Hostinger',google:'Google',microsoft:'Microsoft',unknown:'Provider TBD'}[p]||p);
  const areaClass=a=>({'Primeva Labs':'labs','Primeva Health':'health','Three Rivers':'three','Personal':'personal'}[a]||'personal');

  async function loadEmailData(){
    if(!ds.user)return;
    const [a,m]=await Promise.all([
      ds.client.from('email_accounts').select('*').order('area').order('email_address'),
      ds.client.from('email_messages').select('*').order('received_at',{ascending:false}).limit(200)
    ]);
    if(a.error)throw a.error;if(m.error)throw m.error;
    accounts=a.data||[];messages=m.data||[];
  }

  function visibleMessages(){return messages.filter(m=>{
    if(filter==='all')return true;
    if(filter==='needs_reply')return m.action_state==='needs_reply';
    if(filter==='waiting_on')return m.action_state==='waiting_on';
    if(filter==='labs')return m.area==='Primeva Labs';
    if(filter==='health')return m.area==='Primeva Health';
    if(filter==='three')return m.area==='Three Rivers';
    if(filter==='personal')return m.area==='Personal';
    return true;
  });}

  function accountRow(a){
    const connected=a.sync_status==='connected';
    const btn=a.provider==='hostinger'
      ? `<button class="email-btn ${connected?'secondary':''}" data-connect-hostinger="${esc(a.email_address)}">${connected?'Refresh':'Connect'}</button>`
      : `<button class="email-btn secondary" data-provider-info="${esc(a.email_address)}">${a.provider==='google'?'Connect Google':'Choose provider'}</button>`;
    return `<div class="email-account-row">
      <div class="email-avatar ${areaClass(a.area)}">${esc(a.area.split(' ').map(x=>x[0]).join('').slice(0,2))}</div>
      <div class="email-account-main"><b>${esc(a.email_address)}</b><span>${esc(a.area)} · ${providerLabel(a.provider)}</span></div>
      <div class="email-account-count"><strong>${Number(a.unread_count||0)}</strong><span>unread</span></div>
      <span class="email-status ${connected?'connected':''}">${connected?'Connected':'Not connected'}</span>${btn}
    </div>`;
  }

  function messageRow(m){return `<div class="email-message-row ${m.unread?'unread':''}">
    <div class="email-message-dot ${areaClass(m.area)}"></div>
    <div class="email-message-main"><div class="email-message-top"><b>${esc(m.sender||'Unknown sender')}</b><span>${fmt(m.received_at)}</span></div><strong>${esc(m.subject||'(no subject)')}</strong><p>${esc(m.snippet||m.body_preview||'')}</p><div class="email-meta"><span>${esc(m.account_email)}</span>${m.action_state!=='none'?`<span class="email-action-state">${esc(m.action_state.replace('_',' '))}</span>`:''}</div></div>
  </div>`}

  function renderOverlay(){
    if(!overlay)return;
    const totalUnread=accounts.reduce((s,a)=>s+Number(a.unread_count||0),0), connected=accounts.filter(a=>a.sync_status==='connected').length;
    const need=messages.filter(m=>m.action_state==='needs_reply').length, waiting=messages.filter(m=>m.action_state==='waiting_on').length;
    const vis=visibleMessages();
    overlay.innerHTML=`<div class="email-shell">
      <header class="email-header"><div><div class="eyebrow">PERSONAL OPERATING SYSTEM</div><h1>Email</h1><p>11 identities · one action-oriented inbox.</p></div><div class="email-header-actions"><button class="email-btn secondary" id="emailRefresh">↻ Refresh</button><button class="email-close" id="emailClose">×</button></div></header>
      <div class="email-content">
        <section class="email-kpis"><div><span>Accounts</span><strong>${connected}/${accounts.length}</strong></div><div><span>Unread</span><strong>${totalUnread}</strong></div><div><span>Needs reply</span><strong>${need}</strong></div><div><span>Waiting on</span><strong>${waiting}</strong></div></section>
        <section class="email-grid">
          <aside class="email-accounts"><div class="email-section-head"><div><h3>MAILBOXES</h3><span>Each reply stays tied to its original identity.</span></div></div>${accounts.map(accountRow).join('')}</aside>
          <main class="email-inbox"><div class="email-section-head"><div><h3>UNIFIED INBOX</h3><span>AI triage activates after message sync is enabled.</span></div></div>
            <div class="email-filters">${[['all','All'],['needs_reply','Needs Reply'],['waiting_on','Waiting On'],['labs','Labs'],['health','Health'],['three','Three Rivers'],['personal','Personal']].map(([k,l])=>`<button data-email-filter="${k}" class="${filter===k?'active':''}">${l}</button>`).join('')}</div>
            <div class="email-message-list">${vis.length?vis.map(messageRow).join(''):`<div class="email-empty"><div>✉</div><h3>${connected?'Mailbox connections are working.':'Connect your mailboxes to start.'}</h3><p>${connected?'Full message ingestion and AI reply triage will be enabled after the first connection tests are complete.':'Start with any Primeva mailbox. The password is entered here and stored encrypted in Vault.'}</p></div>`}</div>
          </main>
        </section>
      </div>
    </div>`;
    bindOverlay();
  }

  function passwordModal(email){
    const m=document.createElement('div');m.className='email-modal-wrap';m.innerHTML=`<div class="email-modal"><h3>Connect ${esc(email)}</h3><p>Enter the password used for this Hostinger mailbox. It is sent directly to the secure server for validation and encrypted Vault storage.</p><input id="emailPassword" type="password" autocomplete="current-password" placeholder="Mailbox password"><div class="email-modal-actions"><button class="email-btn secondary" id="emailCancel">Cancel</button><button class="email-btn" id="emailConnect">Connect mailbox</button></div><div id="emailConnectStatus" class="email-connect-status"></div></div>`;document.body.appendChild(m);
    const close=()=>m.remove();m.querySelector('#emailCancel').onclick=close;
    m.querySelector('#emailConnect').onclick=async()=>{const pw=m.querySelector('#emailPassword').value;if(!pw)return;const b=m.querySelector('#emailConnect');const s=m.querySelector('#emailConnectStatus');b.disabled=true;b.textContent='Connecting…';s.textContent='Validating encrypted IMAP login…';try{const {data,error}=await ds.client.functions.invoke('hostinger-email',{body:{action:'connect',account_email:email,password:pw}});if(error)throw error;if(data?.error)throw new Error(data.error);s.textContent=`Connected · ${data.unread||0} unread`;await loadEmailData();setTimeout(()=>{close();renderOverlay()},500)}catch(e){s.textContent=e.message||'Connection failed';b.disabled=false;b.textContent='Connect mailbox';}};
  }

  function bindOverlay(){
    overlay.querySelector('#emailClose').onclick=hideEmail;
    overlay.querySelector('#emailRefresh').onclick=async e=>{const b=e.currentTarget;b.disabled=true;b.textContent='Refreshing…';try{for(const a of accounts.filter(x=>x.provider==='hostinger'&&x.sync_status==='connected')){await ds.client.functions.invoke('hostinger-email',{body:{action:'refresh-counts',account_email:a.email_address}})}await loadEmailData();renderOverlay()}catch(err){console.warn(err)}finally{if(document.body.contains(b)){b.disabled=false;b.textContent='↻ Refresh'}}};
    overlay.querySelectorAll('[data-connect-hostinger]').forEach(b=>b.onclick=()=>{const email=b.dataset.connectHostinger;const a=accounts.find(x=>x.email_address===email);if(a?.sync_status==='connected'){ds.client.functions.invoke('hostinger-email',{body:{action:'refresh-counts',account_email:email}}).then(()=>loadEmailData()).then(renderOverlay).catch(console.warn)}else passwordModal(email)});
    overlay.querySelectorAll('[data-provider-info]').forEach(b=>b.onclick=()=>{const email=b.dataset.providerInfo;const a=accounts.find(x=>x.email_address===email);alert(a?.provider==='google'?'Google OAuth connection is the next step. Your current ChatGPT Gmail connection is separate from the Personal OS dashboard.':'We need to identify whether Three Rivers uses Microsoft 365, Google Workspace, or another provider. No password is needed here yet.');});
    overlay.querySelectorAll('[data-email-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.emailFilter;renderOverlay()});
  }

  async function showEmail(){
    try{await loadEmailData()}catch(e){console.warn(e)}
    if(!overlay){overlay=document.createElement('div');overlay.id='personalOsEmailOverlay';document.body.appendChild(overlay)}
    overlay.style.display='block';document.body.classList.add('email-open');renderOverlay();
  }
  function hideEmail(){if(overlay)overlay.style.display='none';document.body.classList.remove('email-open')}

  function replaceText(root,from,to){const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){if(n.nodeValue?.trim()===from)n.nodeValue=n.nodeValue.replace(from,to)}}
  function ensureNav(){
    if(document.getElementById('emailNavItem'))return;
    const labels=[...document.querySelectorAll('body *')].filter(x=>x.childElementCount===0&&x.textContent?.trim()==='Calendar');
    const label=labels[0];if(!label)return;
    let item=label.closest('button,a,[role="button"]')||label.parentElement;if(!item)return;
    const clone=item.cloneNode(true);clone.id='emailNavItem';replaceText(clone,'Calendar','Email');const svg=clone.querySelector('svg');if(svg){svg.outerHTML='<span class="email-nav-icon">✉</span>'}
    clone.onclick=e=>{e.preventDefault();e.stopPropagation();showEmail()};item.insertAdjacentElement('afterend',clone);
  }

  const style=document.createElement('style');style.id='emailPatchStyles';style.textContent=`
  #personalOsEmailOverlay{position:fixed;inset:0 0 0 252px;z-index:9000;background:#f5f7fb;overflow:auto;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#182236}.email-shell{min-height:100vh}.email-header{height:154px;background:#fff;border-bottom:1px solid #e5eaf2;padding:28px 34px;box-sizing:border-box;display:flex;justify-content:space-between;align-items:center}.email-header h1{font-size:28px;margin:5px 0}.email-header p{font-size:12px;color:#8b96a9;margin:0}.eyebrow{font-size:9px;letter-spacing:.18em;color:#8591a5;font-weight:800}.email-header-actions{display:flex;gap:10px}.email-close{width:40px;height:40px;border:1px solid #dce3ee;border-radius:12px;background:#fff;font-size:23px;color:#66748b;cursor:pointer}.email-content{padding:26px 34px 60px}.email-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px}.email-kpis>div{background:#fff;border:1px solid #e2e8f1;border-radius:15px;padding:14px 16px;box-shadow:0 4px 14px rgba(34,48,78,.03)}.email-kpis span{font-size:10px;color:#8793a7;display:block}.email-kpis strong{font-size:23px;margin-top:4px;display:block}.email-grid{display:grid;grid-template-columns:minmax(380px,.9fr) minmax(480px,1.3fr);gap:16px}.email-accounts,.email-inbox{background:#fff;border:1px solid #e2e8f1;border-radius:18px;padding:17px;min-height:540px}.email-section-head{display:flex;justify-content:space-between;margin-bottom:12px}.email-section-head h3{font-size:11px;letter-spacing:.08em;margin:0 0 4px}.email-section-head span{font-size:10px;color:#8a95a8}.email-account-row{display:grid;grid-template-columns:34px minmax(0,1fr) 48px 88px 74px;gap:8px;align-items:center;border-top:1px solid #edf0f5;padding:10px 0}.email-avatar{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;font-size:9px;font-weight:800;background:#eef1ff;color:#5d6fe8}.email-avatar.labs,.email-message-dot.labs{background:#eef1ff;color:#5d6fe8}.email-avatar.health,.email-message-dot.health{background:#edf9f4;color:#289d70}.email-avatar.three,.email-message-dot.three{background:#eef6ff;color:#3b82c4}.email-avatar.personal,.email-message-dot.personal{background:#f4f0ff;color:#7a5bd5}.email-account-main{min-width:0}.email-account-main b{font-size:10.5px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.email-account-main span,.email-account-count span{font-size:8.5px;color:#8995a8;display:block;margin-top:2px}.email-account-count{text-align:center}.email-account-count strong{font-size:12px}.email-status{font-size:8px;color:#9aa4b5;background:#f1f3f7;border-radius:99px;padding:5px 7px;text-align:center}.email-status.connected{color:#278963;background:#edf8f3}.email-btn{border:0;border-radius:10px;background:#5c70ea;color:white;font-weight:700;font-size:9px;padding:9px 10px;cursor:pointer}.email-btn.secondary{background:#fff;color:#536078;border:1px solid #dce3ee}.email-btn:disabled{opacity:.6}.email-filters{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px}.email-filters button{border:1px solid #e0e6ef;background:#fff;border-radius:9px;padding:7px 9px;font-size:9px;color:#657289;cursor:pointer}.email-filters button.active{background:#eef1ff;color:#5267e7;border-color:#d8ddff}.email-message-row{display:grid;grid-template-columns:8px 1fr;gap:10px;border-top:1px solid #edf0f5;padding:12px 2px}.email-message-dot{width:7px;height:7px;border-radius:50%;margin-top:6px}.email-message-main{min-width:0}.email-message-top{display:flex;justify-content:space-between;gap:8px}.email-message-top b,.email-message-main>strong{font-size:10px}.email-message-top span{font-size:8.5px;color:#929cad}.email-message-main p{font-size:9.5px;color:#778399;line-height:1.45;margin:5px 0}.email-meta{display:flex;gap:6px;font-size:8px;color:#8994a7}.email-action-state{background:#fff4df;color:#a86d13;border-radius:20px;padding:2px 6px}.email-empty{text-align:center;padding:80px 30px;color:#8591a5}.email-empty>div{font-size:34px}.email-empty h3{font-size:14px;color:#33405a}.email-empty p{font-size:10px;line-height:1.5;max-width:390px;margin:auto}.email-modal-wrap{position:fixed;inset:0;z-index:9999;background:rgba(22,29,44,.42);backdrop-filter:blur(4px);display:grid;place-items:center}.email-modal{width:min(430px,90vw);background:#fff;border-radius:18px;padding:22px;box-shadow:0 24px 80px rgba(20,29,50,.25)}.email-modal h3{font-size:16px;margin:0 0 8px}.email-modal p{font-size:10px;color:#7d899c;line-height:1.5}.email-modal input{width:100%;box-sizing:border-box;border:1px solid #dce3ed;border-radius:10px;padding:12px;font-size:12px;margin:8px 0}.email-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:8px}.email-connect-status{font-size:9px;color:#6c778b;margin-top:10px;min-height:14px}.email-nav-icon{width:18px;display:inline-block;text-align:center;font-size:14px}
  @media(max-width:900px){#personalOsEmailOverlay{left:0}.email-header{height:auto;padding:18px}.email-content{padding:16px}.email-kpis{grid-template-columns:repeat(2,1fr)}.email-grid{grid-template-columns:1fr}.email-accounts{min-height:0}.email-account-row{grid-template-columns:34px minmax(0,1fr) 40px 74px}.email-account-row .email-status{display:none}}
  `;document.head.appendChild(style);

  document.addEventListener('click',e=>{if(overlay&&overlay.style.display!=='none'&&!e.target.closest('#personalOsEmailOverlay')&&!e.target.closest('#emailNavItem')&&e.target.closest('aside,nav'))hideEmail()},true);
  const obs=new MutationObserver(()=>ensureNav());obs.observe(document.documentElement,{childList:true,subtree:true});ensureNav();
  window.PersonalOSEmail={show:showEmail,refresh:async()=>{await loadEmailData();renderOverlay()}};
})();