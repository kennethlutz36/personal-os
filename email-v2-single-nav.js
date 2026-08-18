(()=>{
'use strict';
if(window.__posEmailV2SingleNav)return;window.__posEmailV2SingleNav=true;
let emailNode=null;
function rectOk(r){return r&&r.left<320&&r.top>70&&r.top<760&&r.width>90&&r.width<310&&r.height>24&&r.height<70}
function leaf(label){
  const els=[...document.querySelectorAll('body *')];
  return els.find(el=>{try{if(el.childElementCount!==0||el.textContent?.trim()!==label)return false;const r=el.getBoundingClientRect();return r.left<320&&r.top>70&&r.top<760}catch{return false}})||null;
}
function rowFor(label){
  const l=leaf(label);if(!l)return null;
  let cur=l;
  while(cur&&cur!==document.body){
    const r=cur.getBoundingClientRect();
    if(rectOk(r)&&cur!==l)return cur;
    cur=cur.parentElement;
  }
  return l.parentElement;
}
function replaceLabel(node,from,to){
  const w=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);let n,done=false;
  while((n=w.nextNode())){
    const t=n.nodeValue?.trim();
    if(t===from){n.nodeValue=n.nodeValue.replace(from,to);done=true}
    else if(t==='$'){n.nodeValue=n.nodeValue.replace('$','✉')}
  }
  const svg=node.querySelector?.('svg');
  if(svg){const icon=document.createElement('span');icon.textContent='✉';icon.setAttribute('aria-hidden','true');icon.style.cssText='display:inline-grid;place-items:center;width:18px;height:18px;font-size:11px;flex:0 0 auto';svg.replaceWith(icon)}
  return done;
}
function existingEmails(){
  return [...document.querySelectorAll('#emailNavItem,[data-email-owned="v2"]')].filter(el=>el.isConnected);
}
function attachOwnClick(node){
  if(node.dataset.emailOwnClick==='1')return;
  node.dataset.emailOwnClick='1';
  node.addEventListener('click',()=>{
    setTimeout(()=>{
      const overlay=document.getElementById('personalOsEmailOverlayV2');
      if(overlay)overlay.style.display='block';
    },0);
  });
}
function create(){
  const finance=rowFor('Finance');if(!finance)return null;
  const node=finance.cloneNode(true);
  node.id='emailNavItem';node.dataset.emailOwned='v2';
  node.removeAttribute?.('aria-current');node.removeAttribute?.('href');
  replaceLabel(node,'Finance','Email');
  finance.parentNode?.insertBefore(node,finance);
  emailNode=node;attachOwnClick(node);
  return node;
}
function ensure(){
  let keep=document.getElementById('emailNavItem');
  if(keep&&keep.isConnected){emailNode=keep;attachOwnClick(keep)}
  if((!keep||!keep.isConnected)&&emailNode){
    const finance=rowFor('Finance');
    if(finance&&finance.parentNode){finance.parentNode.insertBefore(emailNode,finance);keep=emailNode}
  }
  if(!keep||!keep.isConnected)keep=create();
  const extras=existingEmails();
  if(keep)for(const el of extras){if(el!==keep)el.remove()}
  return !!(keep&&keep.isConnected);
}
const obs=new MutationObserver(()=>queueMicrotask(ensure));
obs.observe(document.documentElement,{childList:true,subtree:true});
setInterval(ensure,500);
[0,300,900,1800,3500,7000].forEach(ms=>setTimeout(ensure,ms));
})();