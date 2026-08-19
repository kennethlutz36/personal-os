(()=>{
'use strict';
if(window.__emailAutoRefreshV29)return;window.__emailAutoRefreshV29=1;
const KEY='pos_email_provider_refresh_v29';
const GAP=5*60*1000;
let busy=false,timer=null;
function pageOpen(){return !!document.querySelector('#content .ev5-page #ev5Refresh');}
function last(){try{return Number(sessionStorage.getItem(KEY)||0)||0}catch{return 0}}
function mark(){try{sessionStorage.setItem(KEY,String(Date.now()))}catch{}}
function schedule(ms=250){clearTimeout(timer);timer=setTimeout(run,ms)}
function run(){
  if(busy||document.visibilityState!=='visible'||!pageOpen())return;
  if(Date.now()-last()<GAP)return;
  const b=document.querySelector('#content .ev5-page #ev5Refresh');
  if(!b||b.disabled)return;
  busy=true;mark();
  try{b.click()}finally{setTimeout(()=>{busy=false},12000)}
}
new MutationObserver(()=>{if(pageOpen())schedule(350)}).observe(document.getElementById('content')||document.body,{childList:true,subtree:true});
window.addEventListener('focus',()=>schedule(150));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule(150)});
setInterval(run,60000);
setTimeout(()=>schedule(500),1200);
})();
