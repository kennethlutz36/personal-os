(()=>{
  'use strict';
  try{
    const VERSION='hostinger-api-settings-safe-v1';
    const ds=window.PersonalOSData;
    if(!ds||typeof state==='undefined')return;
    const slots=[
      {key:'primeva_health',label:'Primeva Health',domain:'primevahealth.com',expected:4},
      {key:'primeva_labs',label:'Primeva Labs',domain:'primevalabs.com',expected:5}
    ];
    let connections=[];
    let loading=false;
    const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));

    function addStyles(){
      if(document.getElementById('hostingerApiSettingsCss'))return;
      const s=document.createElement('style');s.id='hostingerApiSettingsCss';s.textContent=`
        #hostingerApiSettingsCard{background:linear-gradient(180deg,#fff,#fbfcff);border:1px solid #e2e8f1;border-radius:16px;padding:17px;margin-top:14px;box-shadow:0 5px 18px rgba(31,44,72,.035);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#182236}
        #hostingerApiSettingsCard .ha-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}
        #hostingerApiSettingsCard .ha-head h3{font-size:12px;margin:0 0 4px}.ha-sub{font-size:9px;line-height:1.45;color:#8793a7}.ha-secure{display:inline-flex;align-items:center;gap:5px;border:1px solid #dbe6df;background:#f0faf5;color:#32815f;border-radius:999px;padding:5px 8px;font-size:8px;font-weight:800;white-space:nowrap}
        .ha-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ha-slot{border:1px solid #e7ebf2;border-radius:14px;padding:13px;background:#fff}.ha-slot.connected{border-color:#cee9dc;background:linear-gradient(180deg,#fff,#f8fdfa)}
        .ha-slot-top{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.ha-slot h4{font-size:10.5px;margin:0}.ha-domain{font-size:8px;color:#8c97a8;margin-top:3px}.ha-status{border-radius:999px;padding:5px 7px;font-size:7.5px;font-weight:800;background:#f0f3f7;color:#8490a4}.ha-status.ok{background:#eaf8f1;color:#278963}.ha-status.err{background:#fff1ef;color:#b55749}
        .ha-mailboxes{display:flex;flex-wrap:wrap;gap:5px;margin:10px 0 8px}.ha-mailbox{font-size:7.7px;border:1px solid #e1e6ef;border-radius:8px;padding:4px 6px;color:#617087;background:#fafbfe}.ha-empty{font-size:8px;color:#9aa4b5;margin:10px 0}.ha-connect-row{display:flex;gap:7px;margin-top:10px}.ha-connect-row input{min-width:0;flex:1;border:1px solid #dce3ed;border-radius:10px;padding:9px 10px;font-size:9px;outline:none}.ha-connect-row input:focus{border-color:#8b99ee;box-shadow:0 0 0 3px rgba(92,112,234,.08)}.ha-connect-row button{border:0;border-radius:10px;background:#5c70ea;color:#fff;padding:9px 11px;font-size:8.5px;font-weight:800;cursor:pointer}.ha-connect-row button:disabled{opacity:.55;cursor:default}.ha-msg{min-height:14px;font-size:8px;color:#7d899c;margin-top:7px;line-height:1.4}.ha-msg.err{color:#b55749}.ha-foot{border-top:1px solid #edf0f5;margin-top:13px;padding-top:10px;font-size:8px;color:#8793a7;line-height:1.55}
        @media(max-width:760px){.ha-grid{grid-template-columns:1fr}.ha-head{flex-direction:column}.ha-connect-row{flex-direction:column}.ha-connect-row button{width:100%}}
      `;document.head.appendChild(s);
    }

    async function loadConnections(){
      if(loading||!ds.user)return;
      loading=true;
      try{
        const {data,error}=await ds.client.from('hostinger_mail_connections').select('connection_key,label,order_resource_id,mailbox_addresses,status,last_validated_at,last_error').order('connection_key');
        if(error)throw error;
        connections=data||[];
      }catch(e){console.warn('Hostinger API status',e)}finally{loading=false;render();}
    }

    function connFor(key){return connections.find(c=>c.connection_key===key)||null;}
    function slotHtml(slot){
      const c=connFor(slot.key), connected=c?.status==='connected';
      const boxes=Array.isArray(c?.mailbox_addresses)?c.mailbox_addresses:[];
      const status=c?.status==='error'?'Error':connected?`Connected · ${boxes.length}/${slot.expected}`:'Not connected';
      const statusClass=c?.status==='error'?'err':connected?'ok':'';
      return `<section class="ha-slot ${connected?'connected':''}" data-ha-slot="${slot.key}">
        <div class="ha-slot-top"><div><h4>${esc(slot.label)}</h4><div class="ha-domain">@${esc(slot.domain)} · expected ${slot.expected} mailboxes</div></div><span class="ha-status ${statusClass}">${esc(status)}</span></div>
        ${boxes.length?`<div class="ha-mailboxes">${boxes.map(x=>`<span class="ha-mailbox">${esc(x)}</span>`).join('')}</div>`:`<div class="ha-empty">Create an Agentic Mail API token with <b>All mailboxes</b> access for this Hostinger email order.</div>`}
        <div class="ha-connect-row"><input type="password" autocomplete="off" spellcheck="false" data-ha-token="${slot.key}" placeholder="Paste Hostinger Agentic Mail API token"><button type="button" data-ha-connect="${slot.key}">${connected?'Replace token':'Connect'}</button></div>
        <div class="ha-msg ${c?.last_error?'err':''}" data-ha-msg="${slot.key}">${c?.last_error?esc(c.last_error):connected&&c?.last_validated_at?`Validated ${new Date(c.last_validated_at).toLocaleString()}`:'Token is sent only to the secure backend for validation.'}</div>
      </section>`;
    }

    function render(){
      if(state.route!=='settings')return;
      const content=document.getElementById('content')||document.querySelector('.content');
      if(!content)return;
      let root=document.getElementById('hostingerApiSettingsCard');
      if(!root){root=document.createElement('section');root.id='hostingerApiSettingsCard';content.appendChild(root);}
      root.innerHTML=`<div class="ha-head"><div><h3>Hostinger Native Mail API</h3><div class="ha-sub">Provider-native access for Primeva email. Tokens are validated against Hostinger and encrypted in Supabase Vault.</div></div><span class="ha-secure">● Vault encrypted</span></div><div class="ha-grid">${slots.map(slotHtml).join('')}</div><div class="ha-foot"><b>Use Agentic Mail → API tokens, not mailbox passwords.</b> Create one <b>All mailboxes</b> token for Primeva Health and one for Primeva Labs. Personal OS never writes the token to GitHub, localStorage, sessionStorage, or the email database.</div>`;
      root.querySelectorAll('[data-ha-connect]').forEach(btn=>btn.addEventListener('click',()=>connectSlot(btn.dataset.haConnect)));
    }

    async function connectSlot(key){
      const slot=slots.find(s=>s.key===key);if(!slot)return;
      const input=document.querySelector(`[data-ha-token="${key}"]`);
      const btn=document.querySelector(`[data-ha-connect="${key}"]`);
      const msg=document.querySelector(`[data-ha-msg="${key}"]`);
      let token=String(input?.value||'').trim();
      if(!token){if(msg){msg.textContent='Paste the Hostinger Agentic Mail API token first.';msg.classList.add('err')}return;}
      if(input)input.value='';
      if(btn){btn.disabled=true;btn.textContent='Validating…';}
      if(msg){msg.textContent=`Checking ${slot.label} directly with Hostinger…`;msg.classList.remove('err');}
      try{
        const {data,error}=await ds.client.functions.invoke('hostinger-mail-api-connect',{body:{action:'connect',connection_key:key,token}});
        token='';
        if(error)throw error;
        if(data?.error)throw new Error(data.error);
        const count=Number(data?.count||0);
        if(msg)msg.textContent=`Connected. Hostinger validated ${count} mailbox${count===1?'':'es'}.`;
        await loadConnections();
      }catch(e){
        token='';
        if(msg){msg.textContent=e?.message||'Connection failed';msg.classList.add('err');}
        if(btn){btn.disabled=false;btn.textContent=connFor(key)?.status==='connected'?'Replace token':'Connect';}
      }
    }

    function tick(){
      if(state.route!=='settings')return;
      addStyles();
      if(!document.getElementById('hostingerApiSettingsCard')){render();loadConnections();}
    }
    addStyles();
    setInterval(tick,900);
    setInterval(()=>{if(state.route==='settings')loadConnections();},60000);
    window.PersonalOSHostingerApiSettings={version:VERSION,refresh:loadConnections};
  }catch(e){console.warn('Hostinger API settings disabled safely',e)}
})();