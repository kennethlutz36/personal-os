(()=>{
'use strict';
if(window.__posEmailRoutePolishV1)return;window.__posEmailRoutePolishV1=true;
function addStyles(){
  if(document.getElementById('er4PolishV1'))return;
  const s=document.createElement('style');s.id='er4PolishV1';s.textContent=`
    body.pos-email-route-active #content{min-width:0!important;max-width:100%!important;overflow-x:hidden!important}
    .er4-page{width:100%!important;max-width:100%!important;min-width:0!important;box-sizing:border-box!important;overflow-x:hidden!important;padding:22px 24px 50px!important}
    .er4-page-head,.er4-kpis,.er4-grid,.er4-card,.er4-inbox,.er4-title,.er4-list,.er4-msg,.er4-msg>span{min-width:0!important;max-width:100%!important;box-sizing:border-box!important}
    .er4-grid{grid-template-columns:minmax(260px,340px) minmax(0,1fr)!important;width:100%!important;gap:14px!important;align-items:start!important}
    .er4-card{overflow:hidden!important}
    .er4-inbox{width:100%!important}
    .er4-title>div{min-width:0!important}
    .er4-title input{width:min(240px,32vw)!important;max-width:100%!important;flex:0 1 240px!important}
    .er4-msg{overflow:hidden!important}
    .er4-msg-top{gap:12px!important;min-width:0!important}
    .er4-msg-top b,.er4-msg>span>strong,.er4-msg p,.er4-msg small{min-width:0!important;max-width:100%!important;overflow:hidden!important;text-overflow:ellipsis!important}
    .er4-msg-top b{white-space:nowrap!important}
    .er4-msg-top time{flex:0 0 auto!important}
    .er4-account{min-width:0!important;grid-template-columns:32px minmax(0,1fr) 42px 68px!important}
    .er4-account-main{min-width:0!important}
    .er4-filters{display:inline-flex!important;align-items:center!important;gap:4px!important;max-width:100%!important;overflow-x:auto!important;padding:5px!important;margin:1px 0 11px!important;border:1px solid #e1e6f0!important;border-radius:14px!important;background:linear-gradient(180deg,#f8faff 0%,#f2f5fb 100%)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 4px 14px rgba(41,55,88,.05)!important;scrollbar-width:none!important}
    .er4-filters::-webkit-scrollbar{display:none!important}
    .er4-filters button{display:inline-flex!important;align-items:center!important;gap:7px!important;white-space:nowrap!important;border:0!important;border-radius:10px!important;padding:8px 11px!important;background:transparent!important;color:#667289!important;font-size:8.5px!important;font-weight:800!important;letter-spacing:.01em!important;transition:transform .16s ease,box-shadow .16s ease,background .16s ease,color .16s ease!important}
    .er4-filters button:before{content:'';width:6px;height:6px;border-radius:50%;background:#9aa6b7;box-shadow:0 0 0 3px rgba(154,166,183,.11)}
    .er4-filters button[data-filter='needs_reply']:before{background:#e8a62a;box-shadow:0 0 0 3px rgba(232,166,42,.12)}
    .er4-filters button[data-filter='waiting_on']:before{background:#36a3e5;box-shadow:0 0 0 3px rgba(54,163,229,.12)}
    .er4-filters button[data-filter='labs']:before{background:#6674ec;box-shadow:0 0 0 3px rgba(102,116,236,.12)}
    .er4-filters button[data-filter='health']:before{background:#27ad79;box-shadow:0 0 0 3px rgba(39,173,121,.12)}
    .er4-filters button[data-filter='personal']:before{background:#825fd5;box-shadow:0 0 0 3px rgba(130,95,213,.12)}
    .er4-filters button:hover{background:#fff!important;color:#33425b!important;box-shadow:0 4px 12px rgba(43,56,86,.08)!important;transform:translateY(-1px)!important}
    .er4-filters button.active{background:linear-gradient(135deg,#536bea 0%,#725be1 100%)!important;color:#fff!important;box-shadow:0 7px 18px rgba(83,107,234,.22)!important}
    .er4-filters button.active:before{background:#fff!important;box-shadow:0 0 0 3px rgba(255,255,255,.18)!important}
    .er4-kpis div{position:relative!important;overflow:hidden!important}
    .er4-kpis div:after{content:'';position:absolute;left:0;right:0;bottom:0;height:3px;background:#d7deec}
    .er4-kpis div:nth-child(1):after{background:#6f63e8}.er4-kpis div:nth-child(2):after{background:#3b9fe0}.er4-kpis div:nth-child(3):after{background:#e8a62a}.er4-kpis div:nth-child(4):after{background:#27ad79}
    .er4-modal [data-status].quota{color:#a2640f!important;background:#fff6df!important;border:1px solid #f0dca9!important;border-radius:9px!important;padding:8px 10px!important;line-height:1.45!important}
    .er4-billing-link{display:inline-flex!important;align-items:center!important;text-decoration:none!important;border:1px solid #edd39b!important;background:#fff8e8!important;color:#91600f!important;border-radius:9px!important;padding:8px 10px!important;font-size:8.5px!important;font-weight:800!important}
    @media(max-width:1180px){.er4-grid{grid-template-columns:minmax(240px,300px) minmax(0,1fr)!important}.er4-page{padding-left:18px!important;padding-right:18px!important}}
    @media(max-width:980px){.er4-grid{grid-template-columns:1fr!important}.er4-kpis{grid-template-columns:repeat(2,minmax(0,1fr))!important}.er4-card{min-height:0!important}.er4-title{align-items:flex-start!important;flex-direction:column!important}.er4-title input{width:100%!important;max-width:none!important}.er4-page{padding:16px!important}}
  `;document.head.appendChild(s);
}
function isQuota(text){return /exceeded your current quota|insufficient[_ -]?quota|billing quota|check your plan and billing/i.test(String(text||''))}
function enhanceQuota(){
  const modal=document.getElementById('posEmailRouteModal');if(!modal)return;
  const st=modal.querySelector('[data-status]');if(!st||!isQuota(st.textContent))return;
  st.classList.add('quota');
  st.textContent='AI drafting is paused because this OpenAI API project has no available quota. Manual replies and direct sending still work. Add API billing or credits, then try Generate AI draft again.';
  if(!modal.querySelector('.er4-billing-link')){
    const link=document.createElement('a');link.className='er4-billing-link';link.href='https://platform.openai.com/settings/organization/billing/overview';link.target='_blank';link.rel='noopener';link.textContent='Open API billing ↗';
    const actions=modal.querySelector('.er4-actions');actions?.appendChild(link);
  }
}
function syncState(){
  const active=typeof state!=='undefined'&&String(state.route||'')==='email';document.body.classList.toggle('pos-email-route-active',active);if(active){document.getElementById('content')?.style.setProperty('min-width','0')}
  enhanceQuota();
}
addStyles();syncState();
const obs=new MutationObserver(()=>queueMicrotask(syncState));obs.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
setInterval(syncState,700);
})();