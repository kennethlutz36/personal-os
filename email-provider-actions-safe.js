(()=>{
'use strict';
try{
  const VERSION='email-provider-actions-safe-v1';
  function accountFromModal(modal){
    const eyebrow=modal?.querySelector('.eyebrow')?.textContent||'';
    const m=eyebrow.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return m?.[0]?.toLowerCase()||'';
  }
  function enhance(){
    const modal=document.querySelector('.email-message-modal');
    if(!modal)return;
    const ai=modal.querySelector('[data-email-ai]');
    const provider=modal.querySelector('[data-email-provider]');
    if(ai){
      ai.textContent='✦ Draft reply with ChatGPT';
      ai.title='Copies this message context and opens ChatGPT so you can review the generated reply before any provider action.';
    }
    const account=accountFromModal(modal);
    if(provider){
      if(account.endsWith('@gmail.com')) provider.textContent='↗ Open Gmail';
      else if(/@primeva(labs|health)\.com$/i.test(account)) provider.textContent='↗ Open Hostinger';
    }
    const bar=modal.querySelector('.email-premium-modal-actions');
    if(bar&&!modal.querySelector('[data-email-provider-note]')){
      const note=document.createElement('div');
      note.dataset.emailProviderNote='1';
      note.style.cssText='margin:-2px 0 13px;padding:10px 12px;border:1px solid #e7ebf3;border-radius:11px;background:#f8faff;color:#6d7890;font-size:9px;line-height:1.5';
      note.innerHTML='<b style="color:#33405a">Review-first workflow.</b> ChatGPT drafts the reply from this message context. After you approve it, Gmail can save a threaded draft; authorized Hostinger Mail accounts can be handled through ChatGPT. Nothing is sent automatically from Personal OS.';
      bar.insertAdjacentElement('afterend',note);
    }
  }
  setInterval(enhance,700);
  window.PersonalOSEmailProviderActions={version:VERSION,refresh:enhance};
}catch(e){console.warn('Email provider actions disabled safely',e)}
})();