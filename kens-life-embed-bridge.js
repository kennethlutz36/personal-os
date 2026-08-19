(()=>{
  'use strict';
  if (window.KensLifeEmbed) return;

  const allowed = new Set(['overview','tasks','calendar','email','finance','health','life','settings']);
  const norm = v => String(v || '').replace(/\s+/g,' ').trim().toLowerCase();

  function navigate(target){
    const routeKey = String(target || '').toLowerCase();
    if (!allowed.has(routeKey)) return false;
    try {
      if (typeof state === 'undefined' || typeof render !== 'function') return false;
      if (String(state.route || '') !== routeKey) {
        state.route = routeKey;
        render();
      }
      if (typeof enhance === 'function') setTimeout(()=>{ try { enhance(); } catch {} }, 40);
      window.dispatchEvent(new CustomEvent('kens-life-personal-route',{detail:{route:routeKey}}));
      return true;
    } catch {
      return false;
    }
  }

  function prepare(){
    try {
      const mobileNav = document.getElementById('posv10MobileNav');
      if (mobileNav) mobileNav.style.setProperty('display','none','important');
      document.documentElement.style.setProperty('--kens-life-embedded','1');
      return true;
    } catch {
      return false;
    }
  }

  function chrome(){
    try {
      prepare();
      const zones=[...document.querySelectorAll('aside,[class*="sidebar" i],[data-pos-mobile-sidebar]')];
      const sidebar=zones.find(el=>{
        const r=el.getBoundingClientRect();
        const t=norm(el.textContent);
        return r.width>=150&&r.width<=380&&r.height>300&&r.left<20&&
          (t.includes('personal os')||((t.includes('calendar')||t.includes('to-do')||t.includes('tasks'))&&t.includes('finance')&&t.includes('health')));
      });
      const left=sidebar?Math.max(0,Math.round(sidebar.getBoundingClientRect().right)):0;

      const headers=[...document.querySelectorAll('header,[class*="topbar" i],[class*="header" i]')];
      const header=headers.find(el=>{
        const r=el.getBoundingClientRect();
        if(r.top>24||r.height<35||r.height>140)return false;
        const t=norm(el.textContent);
        return (t.includes('start day')&&t.includes('ai brief'))||
          (t.includes('live')&&t.includes('synced')&&t.includes('sign out'))||
          (r.left>=Math.max(0,left-20)&&r.width>Math.max(480,innerWidth*.55));
      });
      const top=header?Math.max(0,Math.round(header.getBoundingClientRect().bottom)):0;
      return {left,top};
    } catch {
      return {left:0,top:0};
    }
  }

  window.KensLifeEmbed = {
    navigate,
    prepare,
    chrome,
    ready(){
      try { return typeof state !== 'undefined' && typeof render === 'function'; }
      catch { return false; }
    },
    current(){
      try { return typeof state !== 'undefined' ? String(state.route || '') : ''; }
      catch { return ''; }
    }
  };
})();
