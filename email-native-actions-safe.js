(()=>{
'use strict';
try{
  const VERSION='email-native-actions-safe-v1';
  let selectedMessageId='';
  let syncing=false;
  const ds=window.PersonalOSData;
  const isHostinger=a=>/@primeva(?:labs|health)\.com$/i.test(String(a||''));
  const accountFromModal=modal=>{
    const eyebrow=modal?.querySelector('.eyebrow')?.textContent||'';
    return (eyebrow.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]||'').toLowerCase();
  };
  function toast(text){
    document.getElementById('emailNativeToast')?.remove();
    const t=document.createElement('div');t.id='emailNativeToast';t.textContent=text;
    t.style.cssText='position:fixed;right:24px;bottom:24px;z-index:10120;background:#172036;color:#fff;padding:11px 14px;border-radius:12px;font-size:10px;font-weight:800;box-shadow:0 15px 42px rgba(20,28,44,.24)';
    document.body.appendChild(t);setTimeout(()=>t.remove(),2800);
  }
  function relabelCards(){
    document.querySelectorAll('#personalOsEmailOverlay .email-account-main span').forEach(el=>{
      if(/Primeva (Labs|Health) · Hostinger$/i.test(el.textContent||''))el.textContent=(el.textContent||'').replace(/Hostinger$/i,'Hostinger Native');
    });
  }
  async function nativeSync(){
    if(syncing||!ds?.user)return;
    const last=Number(sessionStorage.getItem('pos_hostinger_native_meta_sync')||0);
    if(Date.now()-last<10*60*1000)return;
    syncing=true;
    try{
      const {data,error}=await ds.client.functions.invoke('hostinger-mail-native',{body:{action:'sync-metadata'}});
      if(error)throw error;if(data?.error)throw new Error(data.error);
      sessionStorage.setItem('pos_hostinger_native_meta_sync',String(Date.now()));
    }catch(e){console.warn('Hostinger native metadata sync',e)}finally{syncing=false;}
  }
  function ensureComposer(modal){
    if(!modal||modal.querySelector('[data-native-reply-panel]'))return;
    const account=accountFromModal(modal);if(!isHostinger(account)||!selectedMessageId)return;
    const bar=modal.querySelector('.email-premium-modal-actions');if(!bar)return;
    if(!bar.querySelector('[data-native-send-open]')){
      const b=document.createElement('button');b.type='button';b.dataset.nativeSendOpen='1';b.textContent='↗ Send reviewed reply';
      b.style.cssText='background:#172036;border-color:#172036;color:#fff';
      bar.appendChild(b);
      b.onclick=()=>{
        let panel=modal.querySelector('[data-native-reply-panel]');
        if(panel){panel.remove();return;}
        panel=document.createElement('section');panel.dataset.nativeReplyPanel='1';
        panel.style.cssText='margin:12px 0 14px;padding:13px;border:1px solid #dde4ef;border-radius:13px;background:#f8faff';
        panel.innerHTML=`<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:8px"><div><b style="font-size:10px;color:#29364d">Reviewed reply</b><div style="font-size:8px;color:#7e8a9d;margin-top:2px">Sends from ${account} through Hostinger Native Mail and stays threaded to this message.</div></div></div><textarea data-native-reply-text placeholder="Paste the reviewed reply body here…" style="width:100%;min-height:150px;resize:vertical;box-sizing:border-box;border:1px solid #d9e0ec;border-radius:10px;padding:11px;font:10px/1.55 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#223047;background:#fff"></textarea><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:9px"><button type="button" data-native-cancel style="border:1px solid #dce3ed;background:#fff;color:#59667b;border-radius:9px;padding:8px 10px;font-size:9px;font-weight:800;cursor:pointer">Cancel</button><button type="button" data-native-send style="border:1px solid #172036;background:#172036;color:#fff;border-radius:9px;padding:8px 11px;font-size:9px;font-weight:800;cursor:pointer">Send from ${account}</button></div><div data-native-status style="font-size:8.5px;color:#7e8a9d;margin-top:7px"></div>`;
        bar.insertAdjacentElement('afterend',panel);
        panel.querySelector('[data-native-cancel]').onclick=()=>panel.remove();
        panel.querySelector('[data-native-send]').onclick=async e=>{
          const send=e.currentTarget,ta=panel.querySelector('[data-native-reply-text]'),status=panel.querySelector('[data-native-status]');
          const text=String(ta.value||'').trim();if(!text){status.textContent='Add the reviewed reply body first.';ta.focus();return;}
          send.disabled=true;send.textContent='Sending…';status.textContent='Sending a threaded reply through Hostinger Native Mail…';
          try{
            const {data,error}=await ds.client.functions.invoke('hostinger-mail-native',{body:{action:'send-reply',email_message_id:selectedMessageId,text}});
            if(error)throw error;if(data?.error)throw new Error(data.error);
            status.textContent=`Sent from ${data.from} to ${data.to}.`;
            toast('Reply sent through Hostinger Native Mail');
            setTimeout(()=>{document.getElementById('personalOsEmailMessageModal')?.remove();window.PersonalOSEmailPatch?.open?.();window.PersonalOSEmailAttention?.refresh?.();},700);
          }catch(err){status.textContent=err?.message||'Unable to send reply';send.disabled=false;send.textContent=`Send from ${account}`;}
        };
      };
    }
    const note=modal.querySelector('[data-email-provider-note]');
    if(note&&!note.dataset.nativeUpdated){note.dataset.nativeUpdated='1';note.innerHTML='<b style="color:#33405a">Review-first workflow.</b> Use <b>Draft reply with ChatGPT</b> to generate the text, then paste the approved body into <b>Send reviewed reply</b>. Hostinger sends from the exact receiving mailbox with native thread metadata. Nothing is sent automatically.';}
  }
  function enhance(){
    const overlay=document.getElementById('personalOsEmailOverlay');
    if(overlay&&overlay.style.display!=='none'){relabelCards();nativeSync();}
    ensureComposer(document.querySelector('.email-message-modal'));
  }
  document.addEventListener('click',e=>{
    const row=e.target.closest?.('.email-message-row');
    if(row?.dataset?.emailMessage)selectedMessageId=row.dataset.emailMessage;
  },true);
  setInterval(enhance,650);
  window.PersonalOSHostingerNative={version:VERSION,sync:nativeSync};
}catch(e){console.warn('Hostinger native email actions disabled safely',e)}
})();