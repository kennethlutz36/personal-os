(()=>{
  'use strict';
  try{
    const VERSION='email-attention-safe-v1';
    let ds=null;
    let stats={need:0,waiting:0,unread:0,active:0};
    let lastLoaded=0;

    const uniqCount=(rows,state)=>{
      const seen=new Set();
      for(const m of rows||[]){
        if(m.action_state!==state)continue;
        const key=m.thread_id||m.id;
        if(key)seen.add(key);
      }
      return seen.size;
    };

    async function loadStats(force=false){
      if(!ds?.user)return;
      if(!force&&Date.now()-lastLoaded<60000)return;
      const [a,m]=await Promise.all([
        ds.client.from('email_accounts').select('unread_count,sync_status'),
        ds.client.from('email_messages').select('id,thread_id,action_state').in('action_state',['needs_reply','waiting_on']).limit(1000)
      ]);
      if(a.error)throw a.error;
      if(m.error)throw m.error;
      const active=(a.data||[]).filter(x=>x.sync_status!=='ignored');
      stats={
        need:uniqCount(m.data,'needs_reply'),
        waiting:uniqCount(m.data,'waiting_on'),
        unread:active.reduce((s,x)=>s+Number(x.unread_count||0),0),
        active:active.length
      };
      lastLoaded=Date.now();
      updateNavBadge();
      injectBrief();
    }

    function updateNavBadge(){
      const item=document.getElementById('emailNavItem');
      if(!item)return;
      item.style.position=item.style.position||'relative';
      let badge=item.querySelector('[data-email-attention-badge]');
      if(!badge){
        badge=document.createElement('span');
        badge.dataset.emailAttentionBadge='1';
        Object.assign(badge.style,{position:'absolute',top:'4px',right:'5px',minWidth:'16px',height:'16px',padding:'0 4px',borderRadius:'9px',display:'grid',placeItems:'center',fontSize:'9px',fontWeight:'800',lineHeight:'1',background:'#5c70ea',color:'#fff',boxSizing:'border-box',pointerEvents:'none'});
        item.appendChild(badge);
      }
      const n=stats.need;
      badge.textContent=n>99?'99+':String(n);
      badge.style.display=n>0?'grid':'none';
      item.setAttribute('aria-label',n>0?`Email · ${n} need reply`:'Email');
    }

    function injectBrief(){
      const overlay=document.getElementById('liveBriefOverlay');
      if(!overlay||overlay.querySelector('[data-email-attention-safe]'))return;
      const panel=overlay.querySelector('.brief-panel')||overlay;
      const sec=document.createElement('div');
      sec.className='brief-section';
      sec.dataset.emailAttentionSafe='1';
      sec.innerHTML=`<h4>EMAIL ATTENTION</h4><div class="brief-line"><b>${stats.need} need${stats.need===1?'s':''} reply · ${stats.waiting} waiting on</b><div>${stats.unread} unread across ${stats.active||10} active mailboxes.</div><div class="brief-inline-actions"><button type="button" data-open-email-safe>Open Email</button></div></div>`;
      const anchor=[...panel.querySelectorAll('.brief-section')].find(s=>s.querySelector('h4')?.textContent.trim()==='NEGLECTED / CHANGED');
      if(anchor)panel.insertBefore(sec,anchor);else panel.appendChild(sec);
      sec.querySelector('[data-open-email-safe]')?.addEventListener('click',()=>{
        document.getElementById('liveBriefOverlay')?.remove();
        window.PersonalOSEmailPatch?.open?.();
      });
    }

    function tick(){
      updateNavBadge();
      injectBrief();
      if(document.visibilityState==='visible')loadStats(false).catch(e=>console.warn('Email attention stats',e));
    }

    function init(){
      ds=window.PersonalOSData;
      if(!ds)return false;
      loadStats(true).catch(e=>console.warn('Email attention init',e));
      setInterval(tick,1500);
      setInterval(()=>loadStats(true).catch(e=>console.warn('Email attention refresh',e)),5*60*1000);
      document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')loadStats(true).catch(()=>{});});
      window.PersonalOSEmailAttention={version:VERSION,refresh:()=>loadStats(true)};
      return true;
    }

    if(!init()){
      let tries=0;
      const timer=setInterval(()=>{tries++;if(init()||tries>60)clearInterval(timer);},500);
    }
  }catch(e){
    console.warn('Email attention patch disabled safely',e);
  }
})();