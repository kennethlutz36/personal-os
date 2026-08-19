(()=>{
'use strict';
if(window.__emailNavFixV27)return;window.__emailNavFixV27=1;
if(typeof render!=='function'||typeof state==='undefined')return;
function leaf(label){return [...document.querySelectorAll('body *')].find(el=>{try{if(el.childElementCount!==0||el.textContent?.trim()!==label)return false;const r=el.getBoundingClientRect();return r.left<350&&r.top>45&&r.top<850}catch{return false}})||null}
function navRow(label){const l=leaf(label);if(!l)return null;let n=l;while(n&&n!==document.body){const r=n.getBoundingClientRect();if(r.left<350&&r.width>90&&r.width<340&&r.height>25&&r.height<85)return n;n=n.parentElement}return l.parentElement}
function ensure(){
  let n=document.getElementById('emailNavItem');
  if(!n){
    const finance=navRow('Finance');
    if(!finance)return;
    n=finance.cloneNode(true);
    n.id='emailNavItem';
    n.querySelectorAll('[id]').forEach(x=>x.removeAttribute('id'));
    n.querySelectorAll('[data-route]').forEach(x=>x.setAttribute('data-route','email'));
    if(n.hasAttribute('data-route'))n.setAttribute('data-route','email');
    [...n.querySelectorAll('*')].forEach(x=>{if(x.childElementCount===0&&x.textContent?.trim()==='Finance')x.textContent='Email'});
    [...n.childNodes].forEach(x=>{if(x.nodeType===3&&x.nodeValue?.trim()==='Finance')x.nodeValue='Email'});
    const svg=n.querySelector('svg');if(svg){const i=document.createElement('span');i.textContent='✉';i.style.cssText='display:inline-grid;place-items:center;width:18px;height:18px;font-size:12px';svg.replaceWith(i)}
    n.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();state.route='email';render()},true);
    finance.parentNode?.insertBefore(n,finance);
  }
  const active=String(state.route||'')==='email';
  n.classList.toggle('active',active);
  n.setAttribute('aria-current',active?'page':'false');
}
const base=render;
render=function(){const out=base.apply(this,arguments);setTimeout(ensure,0);return out};
let scheduled=false;
new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;ensure()})}).observe(document.body,{childList:true,subtree:true});
setTimeout(ensure,0);setTimeout(ensure,500);
})();