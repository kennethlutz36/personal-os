(()=>{
'use strict';
if(window.__posTodayHighlightV23)return;window.__posTodayHighlightV23=1;
const TZ='America/Phoenix';
const parts=()=>Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:TZ,weekday:'short',day:'numeric',month:'short'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
const WEEK=['mon','tue','wed','thu','fri','sat','sun'];
function clear(){document.querySelectorAll('.pos-current-day').forEach(x=>x.classList.remove('pos-current-day'));document.querySelectorAll('.pos-current-day-zone').forEach(x=>{x.classList.remove('pos-current-day-zone');x.style.removeProperty('--pos-today-left');x.style.removeProperty('--pos-today-width');x.style.removeProperty('--pos-today-top')})}
function markNative(p){document.querySelectorAll('#content .v2-week .v2-day').forEach(day=>{const h=day.querySelector('.v2-day-head');if(!h)return;const t=h.textContent.toLowerCase();if(t.includes(p.weekday.toLowerCase())&&new RegExp(`(^|\\D)${p.day}(\\D|$)`).test(t)){day.classList.add('pos-current-day');h.classList.add('pos-current-day')}})}
function scoreCalendar(el){const t=(el.textContent||'').toLowerCase();return WEEK.reduce((n,w)=>n+(t.includes(w)?1:0),0)}
function findHeader(p){const leaves=[...document.querySelectorAll('#content *')].filter(el=>el.childElementCount===0&&el.textContent?.trim()===String(p.day));for(const leaf of leaves){let h=leaf.parentElement;for(let i=0;h&&i<4;i++,h=h.parentElement){const t=(h.textContent||'').toLowerCase();const r=h.getBoundingClientRect();if(t.includes(p.weekday.toLowerCase())&&r.width>=55&&r.width<=360&&r.height<=130)return h}}return null}
function findZone(header){let el=header.parentElement;for(let i=0;el&&i<8;i++,el=el.parentElement){const r=el.getBoundingClientRect();if(r.width>500&&r.height>180&&scoreCalendar(el)>=5)return el}return null}
function markGeneric(p){const header=findHeader(p);if(!header)return;header.classList.add('pos-current-day');const zone=findZone(header);if(!zone)return;const zr=zone.getBoundingClientRect(),hr=header.getBoundingClientRect();zone.classList.add('pos-current-day-zone');zone.style.setProperty('--pos-today-left',`${Math.max(0,hr.left-zr.left)}px`);zone.style.setProperty('--pos-today-width',`${hr.width}px`);zone.style.setProperty('--pos-today-top',`${Math.max(0,hr.top-zr.top)}px`)}
function run(){const p=parts();clear();markNative(p);markGeneric(p)}
const style=document.createElement('style');style.id='posTodayHighlightV23Style';style.textContent=`
#content .v2-day.pos-current-day{background:linear-gradient(180deg,rgba(82,107,234,.105),rgba(82,107,234,.035))!important;box-shadow:inset 2px 0 0 rgba(82,107,234,.42),inset -2px 0 0 rgba(82,107,234,.22)!important}
#content .v2-day-head.pos-current-day{background:rgba(82,107,234,.11)!important;border-radius:10px 10px 0 0}
#content .v2-day-head.pos-current-day b,#content .v2-day-head.pos-current-day span{color:#4f63df!important;font-weight:850!important}
.pos-current-day-zone{position:relative!important;isolation:isolate}.pos-current-day-zone::after{content:'';position:absolute;pointer-events:none;left:var(--pos-today-left);top:var(--pos-today-top);width:var(--pos-today-width);height:calc(100% - var(--pos-today-top));background:linear-gradient(180deg,rgba(82,107,234,.095),rgba(82,107,234,.025));border-left:1px solid rgba(82,107,234,.28);border-right:1px solid rgba(82,107,234,.18);z-index:20;box-sizing:border-box}
.pos-current-day-zone .pos-current-day{background:rgba(82,107,234,.12)!important;color:#4f63df!important;font-weight:850!important}
`;document.head.appendChild(style);
new MutationObserver(()=>requestAnimationFrame(run)).observe(document.documentElement,{subtree:true,childList:true});window.addEventListener('resize',run);setInterval(run,30000);setTimeout(run,300);setTimeout(run,1500);
})();