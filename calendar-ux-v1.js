(()=>{
'use strict';
if(window.__calendarUxV1||typeof state==='undefined'||typeof render!=='function')return;
window.__calendarUxV1=1;
const START=0,END=24*60,HOUR_PX=54,HEADER_PX=58;
const fmt=v=>new Date(v).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
const areaOf=e=>e?.source_calendar||e?.area||'';
function getEvent(id){return (window.PersonalOSV2?.events||[]).find(x=>String(x.id)===String(id));}
function resetWeek(){
  const week=document.querySelector('#content .v2-week.cal-timeline-week');
  if(!week)return;
  week.classList.remove('cal-timeline-week');
  week.style.removeProperty('--cal-timeline-top');
  week.style.removeProperty('--cal-timeline-height');
  week.querySelector('.cal-time-rail')?.remove();
  week.querySelectorAll('.v2-day').forEach(day=>{
    day.classList.remove('cal-timeline-day');
    day.style.removeProperty('height');
    day.querySelectorAll('.v2-event[data-event-id]').forEach(el=>{
      el.classList.remove('cal-timed-event','cal-all-day-event');
      ['position','top','left','right','height','z-index','display','width'].forEach(p=>el.style.removeProperty(p));
    });
  });
}
function enhance(){
  if(String(state.route||'')!=='calendar'){resetWeek();return;}
  const V=window.PersonalOSV2;
  const week=document.querySelector('#content .v2-week');
  if(!V?.events||!week)return;
  const days=[...week.querySelectorAll(':scope > .v2-day')];
  if(!days.length)return;

  const dayData=days.map(day=>{
    const rows=[...day.querySelectorAll('.v2-event[data-event-id]')]
      .map(el=>({el,e:getEvent(el.dataset.eventId)}))
      .filter(x=>x.e?.starts_at);
    return {day,rows};
  });
  const maxAllDay=Math.max(0,...dayData.map(x=>x.rows.filter(r=>r.e.all_day).length));
  const allDayHeight=maxAllDay?maxAllDay*34+8:0;
  const timelineTop=HEADER_PX+allDayHeight;
  const timelineHeight=(END-START)/60*HOUR_PX;
  const totalHeight=timelineTop+timelineHeight;

  week.classList.add('cal-timeline-week');
  week.style.setProperty('--cal-timeline-top',`${timelineTop}px`);
  week.style.setProperty('--cal-timeline-height',`${timelineHeight}px`);

  let rail=week.querySelector('.cal-time-rail');
  if(!rail){rail=document.createElement('div');rail.className='cal-time-rail';week.prepend(rail);}
  rail.innerHTML=(maxAllDay?`<span class="cal-all-day-label" style="top:${HEADER_PX+10}px">ALL DAY</span>`:'')+
    Array.from({length:25},(_,i)=>{
      const mins=i*60;
      const label=new Date(2000,0,1,i===24?0:i,0).toLocaleTimeString('en-US',{hour:'numeric'});
      return `<span class="cal-hour-label" style="top:${timelineTop+(mins/60)*HOUR_PX-7}px">${i===24?'12 AM':label}</span>`;
    }).join('');

  for(const {day,rows} of dayData){
    day.classList.add('cal-timeline-day');
    day.style.height=`${totalHeight}px`;
    const allDay=rows.filter(r=>r.e.all_day);
    allDay.forEach((r,i)=>{
      const {el,e}=r;
      el.classList.add('cal-all-day-event');
      el.classList.remove('cal-timed-event');
      el.style.position='absolute';
      el.style.top=`${HEADER_PX+4+i*34}px`;
      el.style.left='6px';
      el.style.right='6px';
      el.style.height='30px';
      el.style.zIndex='3';
      el.style.display='block';
      const meta=el.querySelector('span');
      if(meta)meta.textContent=`All day · ${areaOf(e)}`;
    });

    const timed=rows.filter(r=>!r.e.all_day).map(r=>{
      const s=new Date(r.e.starts_at),en=new Date(r.e.ends_at||new Date(s.getTime()+30*60000));
      const sm=s.getHours()*60+s.getMinutes(),em=Math.max(sm+15,en.getHours()*60+en.getMinutes());
      return {...r,sm,em,slot:Math.floor(sm/30)};
    });
    const groups=new Map();
    timed.forEach(r=>{if(!groups.has(r.slot))groups.set(r.slot,[]);groups.get(r.slot).push(r);});
    for(const group of groups.values())group.forEach((r,idx)=>{r.lane=idx;r.lanes=group.length;});

    for(const r of timed){
      const {el,e,sm,em,lane=0,lanes=1}=r;
      el.classList.add('cal-timed-event');
      el.classList.remove('cal-all-day-event');
      const clippedStart=Math.max(START,Math.min(END,sm));
      const clippedEnd=Math.max(clippedStart+15,Math.min(END,em));
      const top=timelineTop+((clippedStart-START)/60)*HOUR_PX;
      const height=Math.max(34,((clippedEnd-clippedStart)/60)*HOUR_PX);
      const pct=100/lanes;
      el.style.position='absolute';
      el.style.top=`${top}px`;
      el.style.height=`${height}px`;
      el.style.zIndex='4';
      el.style.display=sm>=END||em<=START?'none':'block';
      el.style.left=`calc(${lane*pct}% + 5px)`;
      el.style.right=`calc(${(lanes-lane-1)*pct}% + 5px)`;
      const title=el.querySelector('b');
      if(title){title.textContent=e.title||'';title.title=e.title||'';}
      const meta=el.querySelector('span');
      if(meta){
        meta.textContent=`${fmt(e.starts_at)} – ${fmt(e.ends_at||new Date(new Date(e.starts_at).getTime()+30*60000))} · ${areaOf(e)}`;
        meta.classList.add('cal-time-meta');
      }
      let loc=el.querySelector('.cal-location');
      if(e.location&&!loc){loc=document.createElement('span');loc.className='cal-location';meta?.insertAdjacentElement('afterend',loc);}
      if(loc){loc.textContent=e.location||'';loc.title=e.location||'';loc.style.display=e.location?'block':'none';}
      el.title=[e.title,fmt(e.starts_at)+' – '+fmt(e.ends_at||new Date(new Date(e.starts_at).getTime()+30*60000)),areaOf(e),e.location,e.notes].filter(Boolean).join('\n');
    }
  }
}
const style=document.createElement('style');
style.id='calendarUxV2Style';
style.textContent=`
#content .v2-week.cal-timeline-week{position:relative!important;display:grid!important;grid-template-columns:repeat(7,minmax(140px,1fr))!important;padding-left:66px!important;gap:0!important;overflow-x:auto!important;overflow-y:hidden!important;align-items:start!important;border:1px solid #e0e6ef!important;border-radius:14px!important;background:#fff!important;box-sizing:border-box!important}
#content .v2-week.cal-timeline-week>.v2-day{position:relative!important;min-width:140px!important;border-left:1px solid #e6ebf2!important;overflow:hidden!important;background:#fff!important}
#content .v2-week.cal-timeline-week>.v2-day:first-of-type{border-left:0!important}
#content .v2-week.cal-timeline-week>.v2-day:after{content:"";position:absolute;left:0;right:0;top:var(--cal-timeline-top);height:var(--cal-timeline-height);pointer-events:none;z-index:0;background:repeating-linear-gradient(to bottom,transparent 0,transparent 26px,#eef2f7 26px,#eef2f7 27px,transparent 27px,transparent 53px,#d5deea 53px,#d5deea 54px)}
#content .v2-week.cal-timeline-week .cal-time-rail{position:absolute!important;left:0!important;top:0!important;width:66px!important;height:calc(var(--cal-timeline-top) + var(--cal-timeline-height))!important;background:#f8fafc!important;border-right:1px solid #dfe6ef!important;z-index:7!important;pointer-events:none!important}
#content .v2-week.cal-timeline-week .cal-hour-label,#content .v2-week.cal-timeline-week .cal-all-day-label{position:absolute;right:8px;font-size:10px;font-weight:850;color:#53647b;white-space:nowrap}
#content .v2-week.cal-timeline-week .cal-all-day-label{font-size:8px;letter-spacing:.06em;color:#7b889b}
#content .v2-week.cal-timeline-week .v2-event{box-sizing:border-box!important;min-width:0!important;padding:5px 6px!important;overflow:hidden!important;margin:0!important;box-shadow:0 2px 7px rgba(36,49,72,.06)!important}
#content .v2-week.cal-timeline-week .v2-event b{font-size:9.5px!important;line-height:1.22!important;white-space:normal!important;overflow-wrap:anywhere!important}
#content .v2-week.cal-timeline-week .v2-event .cal-time-meta{display:block!important;font-size:9px!important;line-height:1.15!important;font-weight:850!important;color:#4f6078!important;margin:0 0 3px!important}
#content .v2-week.cal-timeline-week .v2-event .cal-location{display:block;font-size:7.8px!important;color:#7d899b!important;line-height:1.2!important;margin-top:2px!important;white-space:normal!important;overflow-wrap:anywhere!important}
#content .v2-week.cal-timeline-week .cal-all-day-event{height:30px!important}
#content .v2-week.cal-timeline-week .cal-all-day-event b{font-size:8.5px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
#content .v2-week.cal-timeline-week .cal-all-day-event span{font-size:7.5px!important}
@media(max-width:1100px){#content .v2-week.cal-timeline-week{grid-template-columns:repeat(7,minmax(165px,1fr))!important;padding-left:62px!important}#content .v2-week.cal-timeline-week>.v2-day{min-width:165px!important}#content .v2-week.cal-timeline-week .cal-time-rail{width:62px!important}#content .v2-week.cal-timeline-week .cal-hour-label{font-size:9px!important}}
`;
document.head.appendChild(style);
const baseRender=render;
render=function(){baseRender();setTimeout(enhance,40)};
const obs=new MutationObserver(()=>{if(String(state.route||'')==='calendar')requestAnimationFrame(enhance)});
obs.observe(document.getElementById('content')||document.body,{childList:true,subtree:true});
window.addEventListener('resize',()=>{if(String(state.route||'')==='calendar')enhance()});
setInterval(()=>{if(String(state.route||'')==='calendar')enhance()},1500);
setTimeout(enhance,700);
})();