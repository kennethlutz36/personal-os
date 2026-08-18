(()=>{
  'use strict';
  if(window.__posEmailNavV5)return;window.__posEmailNavV5=true;
  const ID='posEmailNavV5';
  const FALL='posEmailFixedFallbackV5';
  const OVERLAY='posEmailStandaloneV5';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ds=()=>window.PersonalOSData;
  function textLeaf(label){
    return [...document.querySelectorAll('body *')].find(el=>el.children.length===0&&el.textContent?.trim()===label&&el.getBoundingClientRect().width>0);
  }
  function navItemFromLeaf(leaf){
    if(!leaf)return null;
    let el=leaf;
    for(let i=0;i<7&&el;i++,el=el.parentElement){
      const r=el.getBoundingClientRect();
      if(r.left<280&&r.width>=120&&r.width<=300&&r.height>=28&&r.height<=64)return el;
    }
    return leaf.closest('button,a,[role="button"]')||leaf.parentElement;
  }
  function icon(){return '<span style="display:inline-grid;place-items:center;width:18px;height:18px;border-radius:6px;background:linear-gradient(135deg,#26c6da,#6b70f2);color:white;font-size:10px;box-shadow:0 5px 12px rgba(38,198,218,.22)">✉</span>'}
  async function openStandalone(){
    document.getElementById(OVERLAY)?.remove();
    const api=ds();if(!api?.user){alert('Sign in to Personal OS first.');return;}
    const root=document.createElement('div');root.id=OVERLAY;root.style.cssText='position:fixed;inset:0;z-index:25000;background:#edf3fb;overflow:auto;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#17223a';
    root.innerHTML='<div style="padding:36px;font-size:14px">Loading Email…</div>';document.body.appendChild(root);
    try{
      const [ar,mr]=await Promise.all([api.client.from('email_accounts').select('*').order('area').order('email_address'),api.client.from('email_messages').select('*').order('received_at',{ascending:false}).limit(180)]);
      if(ar.error)throw ar.error;if(mr.error)throw mr.error;
      const accounts=(ar.data||[]).filter(a=>a.sync_status!=='ignored'), messages=mr.data||[];
      const unread=accounts.reduce((s,a)=>s+Number(a.unread_count||0),0), need=messages.filter(m=>m.action_state==='needs_reply').length;
      root.innerHTML=`<header style="background:radial-gradient(700px 220px at 85% -20%,rgba(41,216,208,.35),transparent 60%),linear-gradient(125deg,#12213e,#35518a 55%,#6652c8);color:#fff;padding:26px 34px;display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:8px;letter-spacing:.18em;font-weight:800;color:#c9d8ee">PERSONAL OPERATING SYSTEM</div><h1 style="margin:5px 0;font-size:28px">Email</h1><p style="margin:0;font-size:10px;color:#dbe5f4">${accounts.length} active identities · unified working inbox</p></div><button id="${OVERLAY}Close" style="width:38px;height:38px;border-radius:10px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.12);color:#fff;font-size:20px;cursor:pointer">×</button></header><main style="padding:20px 30px 50px"><section style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px"><div style="background:#fff;border-radius:15px;padding:14px;box-shadow:0 8px 22px rgba(39,54,84,.07)"><span style="font-size:8px;color:#7e8aa0">ACTIVE ACCOUNTS</span><b style="display:block;font-size:22px">${accounts.length}</b></div><div style="background:#fff;border-radius:15px;padding:14px;box-shadow:0 8px 22px rgba(39,54,84,.07)"><span style="font-size:8px;color:#7e8aa0">UNREAD</span><b style="display:block;font-size:22px">${unread}</b></div><div style="background:#fff;border-radius:15px;padding:14px;box-shadow:0 8px 22px rgba(39,54,84,.07)"><span style="font-size:8px;color:#7e8aa0">NEEDS REPLY</span><b style="display:block;font-size:22px">${need}</b></div></section><section style="display:grid;grid-template-columns:360px 1fr;gap:14px"><aside style="background:#fff;border-radius:17px;padding:15px;box-shadow:0 10px 28px rgba(39,54,84,.07)"><h3 style="font-size:11px;letter-spacing:.08em;margin:0 0 10px">MAILBOXES</h3>${accounts.map(a=>`<button data-mailbox="${esc(a.email_address)}" style="width:100%;text-align:left;border:0;border-top:1px solid #edf0f5;background:#fff;padding:10px 3px;cursor:pointer"><b style="display:block;font-size:10px">${esc(a.email_address)}</b><span style="font-size:8px;color:#7b879b">${esc(a.area)} · ${Number(a.unread_count||0)} unread</span></button>`).join('')}</aside><section style="background:#fff;border-radius:17px;padding:15px;box-shadow:0 10px 28px rgba(39,54,84,.07)"><h3 style="font-size:11px;letter-spacing:.08em;margin:0 0 10px">UNIFIED INBOX</h3><div id="${OVERLAY}List">${messages.slice(0,100).map(m=>`<div data-emailmsg="${esc(m.id)}" style="padding:11px 3px;border-top:1px solid #edf0f5;cursor:pointer"><b style="display:block;font-size:10px">${esc(m.subject||'(no subject)')}</b><span style="font-size:8px;color:#536078">${esc(m.sender||m.account_email||'')}</span><p style="font-size:8.5px;color:#7b879b;margin:3px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(m.snippet||m.body_preview||'')}</p><small style="font-size:7px;color:#94a0b2">${esc(m.account_email||'')} · ${m.action_state&&m.action_state!=='none'?esc(m.action_state.replaceAll('_',' ')):''}</small></div>`).join('')}</div></section></section></main>`;
      root.querySelector('#'+OVERLAY+'Close').onclick=()=>root.remove();
      root.querySelectorAll('[data-mailbox]').forEach(b=>b.onclick=()=>{const email=b.dataset.mailbox;const list=root.querySelector('#'+OVERLAY+'List');list.innerHTML=messages.filter(m=>m.account_email===email).slice(0,100).map(m=>`<div style="padding:11px 3px;border-top:1px solid #edf0f5"><b style="display:block;font-size:10px">${esc(m.subject||'(no subject)')}</b><span style="font-size:8px;color:#536078">${esc(m.sender||'')}</span><p style="font-size:8.5px;color:#7b879b;margin:3px 0">${esc(m.snippet||m.body_preview||'')}</p></div>`).join('')||'<p style="font-size:10px;color:#7b879b">No synced messages for this mailbox.</p>';});
    }catch(e){root.innerHTML=`<div style="padding:36px"><h2>Email could not load</h2><p>${esc(e?.message||e)}</p><button onclick="this.closest('#${OVERLAY}').remove()">Close</button></div>`}
  }
  function openEmail(){
    try{
      const premium=document.getElementById('emailNavItem')||document.getElementById('v2EmailNav')||document.getElementById('posEmailNavPermanent');
      if(premium&&premium!==document.getElementById(ID)){premium.click();setTimeout(()=>{if(!document.getElementById('personalOsEmailOverlay')&&!document.getElementById('personalOsEmailOverlayV2'))openStandalone()},350);return;}
    }catch{}
    openStandalone();
  }
  function makeNav(){
    let n=document.getElementById(ID);if(n)return n;
    n=document.createElement('button');n.id=ID;n.type='button';n.innerHTML=`${icon()}<span>Email</span>`;n.onclick=e=>{e.preventDefault();e.stopPropagation();openEmail()};
    n.style.cssText='display:flex;align-items:center;gap:11px;width:100%;height:38px;padding:0 12px;border:0;border-radius:9px;background:linear-gradient(90deg,rgba(38,198,218,.18),rgba(105,112,242,.12));color:#ecfaff;font:600 14px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer;text-align:left';return n;
  }
  function ensureInserted(){
    if(document.getElementById(ID)&&document.getElementById(ID).isConnected)return true;
    const financeLeaf=textLeaf('Finance');const finance=navItemFromLeaf(financeLeaf);if(!finance?.parentElement)return false;
    const n=makeNav();
    try{finance.parentElement.insertBefore(n,finance);return true}catch{return false}
  }
  function ensureFallback(){
    let b=document.getElementById(FALL);if(!b){b=document.createElement('button');b.id=FALL;b.innerHTML=`${icon()}<span>Email</span>`;b.onclick=openEmail;document.body.appendChild(b)}
    const inserted=document.getElementById(ID)?.isConnected;
    b.style.cssText=inserted?'display:none':'position:fixed;left:12px;bottom:112px;z-index:24000;width:176px;height:38px;border:1px solid rgba(86,211,222,.22);border-radius:9px;background:linear-gradient(90deg,#1a4164,#294b82);color:#fff;display:flex;align-items:center;gap:11px;padding:0 12px;font:600 14px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 10px 24px rgba(7,20,47,.24);cursor:pointer';
  }
  function tick(){ensureInserted();ensureFallback()}
  tick();setInterval(tick,500);window.addEventListener('resize',tick);
})();