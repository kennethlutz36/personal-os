(()=>{
'use strict';
if(window.__posEmailV2SingleNav)return;window.__posEmailV2SingleNav=true;
function candidates(){return [...document.querySelectorAll('button,a,[role="button"]')].filter(el=>{try{const r=el.getBoundingClientRect();return r.left<320&&r.width>40&&el.textContent?.trim()==='Email'}catch{return false}})}
function ensureOne(){let keep=document.getElementById('emailNavItem');const all=candidates();if(!keep&&all.length){keep=all[0];keep.id='emailNavItem'}if(keep){for(const el of all){if(el!==keep)el.remove()}return true}return false}
const obs=new MutationObserver(()=>ensureOne());obs.observe(document.documentElement,{childList:true,subtree:true});
let tries=0;const timer=setInterval(()=>{tries++;if(ensureOne()&&tries>12)clearInterval(timer);if(tries>80)clearInterval(timer)},250);
setTimeout(ensureOne,0);
})();