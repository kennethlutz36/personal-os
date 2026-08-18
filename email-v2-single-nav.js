(()=>{
'use strict';
if(window.__posEmailV2SingleNav)return;window.__posEmailV2SingleNav=true;
let template=null;
function sidebarButtons(){return [...document.querySelectorAll('button,a,[role="button"]')].filter(el=>{try{const r=el.getBoundingClientRect();return r.left<320&&r.width>40}catch{return false}})}
function emailCandidates(){return sidebarButtons().filter(el=>el.textContent?.trim()==='Email')}
function financeCandidate(){return sidebarButtons().find(el=>el.textContent?.trim()==='Finance')||null}
function relabel(node){
  const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);let n,changed=false;
  while((n=walker.nextNode())){
    const t=n.nodeValue?.trim();
    if(t==='Finance'){n.nodeValue=n.nodeValue.replace('Finance','Email');changed=true}
    else if(t==='$'){n.nodeValue=n.nodeValue.replace('$','✉')}
  }
  node.removeAttribute?.('aria-current');
  return changed;
}
function createEmail(){
  const finance=financeCandidate();if(!finance)return null;
  const node=finance.cloneNode(true);node.id='emailNavItem';node.removeAttribute?.('href');node.dataset.emailOwned='v2';relabel(node);
  finance.parentNode?.insertBefore(node,finance);
  template=node;
  return node;
}
function ensureOne(){
  let all=emailCandidates();
  let keep=document.getElementById('emailNavItem');
  if(keep){template=keep}
  if(!keep&&template&&!template.isConnected){
    const finance=financeCandidate();
    if(finance){finance.parentNode?.insertBefore(template,finance);keep=template}
  }
  if(!keep){keep=createEmail()}
  all=emailCandidates();
  if(keep){
    for(const el of all){if(el!==keep)el.remove()}
    return true;
  }
  return false;
}
const obs=new MutationObserver(()=>queueMicrotask(ensureOne));
obs.observe(document.documentElement,{childList:true,subtree:true});
setInterval(ensureOne,500);
setTimeout(ensureOne,0);
setTimeout(ensureOne,1200);
setTimeout(ensureOne,3000);
})();