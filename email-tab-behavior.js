(()=>{
'use strict';
if(window.__posEmailTabBehavior)return;window.__posEmailTabBehavior=true;
const PAGE_LABELS=new Set(['Overview','Tasks','Calendar','Finance','Health','Life','Settings']);
function overlay(){return document.getElementById('personalOsEmailOverlayV2')}
function emailNav(){return document.getElementById('emailNavItem')}
function isOpen(){const o=overlay();return !!(o&&getComputedStyle(o).display!=='none')}
function setActive(on){const n=emailNav();if(!n)return;n.classList.toggle('pos-email-tab-active',!!on)}
function hideEmail(){const o=overlay();if(o)o.style.display='none';document.body.classList.remove('email-open');setActive(false)}
function leafLabel(target){
  const row=target?.closest?.('button,a,[role="button"],#emailNavItem');if(!row)return null;
  try{const r=row.getBoundingClientRect();if(r.left>=320)return null}catch{return null}
  const txt=row.textContent||'';
  if(row.id==='emailNavItem'||txt.trim()==='Email'||/\bEmail\b/.test(txt))return 'Email';
  for(const label of PAGE_LABELS){if(txt.trim()===label||new RegExp(`\\b${label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`).test(txt))return label}
  return null;
}
function syncUi(){
  const o=overlay();
  if(o){const close=o.querySelector('#ev2Close');if(close)close.style.display='none'}
  setActive(isOpen());
}
document.addEventListener('click',e=>{
  const label=leafLabel(e.target);
  if(!label)return;
  if(label==='Email')setTimeout(()=>{syncUi();setActive(true)},0);
  else if(PAGE_LABELS.has(label)&&isOpen())hideEmail();
},true);
const style=document.createElement('style');style.id='emailTabBehaviorStyle';style.textContent=`
#personalOsEmailOverlayV2 #ev2Close{display:none!important}
#emailNavItem.pos-email-tab-active{background:linear-gradient(90deg,rgba(94,112,237,.34),rgba(69,112,174,.22))!important;color:#fff!important;box-shadow:inset 3px 0 0 #8091ff!important}
#emailNavItem.pos-email-tab-active *{color:inherit!important}
`;
document.head.appendChild(style);
new MutationObserver(syncUi).observe(document.documentElement,{childList:true,subtree:true});
setInterval(syncUi,700);setTimeout(syncUi,0);setTimeout(syncUi,1200);
})();