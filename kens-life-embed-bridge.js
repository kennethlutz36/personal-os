(()=>{
  'use strict';
  if (window.KensLifeEmbed) return;

  const allowed = new Set(['overview','tasks','calendar','email','finance','health','life','settings']);

  function navigate(target){
    const routeKey = String(target || '').toLowerCase();
    if (!allowed.has(routeKey)) return false;
    try {
      if (typeof state === 'undefined' || typeof render !== 'function') return false;
      state.route = routeKey;
      render();
      if (typeof enhance === 'function') setTimeout(()=>{ try { enhance(); } catch {} }, 50);
      window.dispatchEvent(new CustomEvent('kens-life-personal-route',{detail:{route:routeKey}}));
      return true;
    } catch {
      return false;
    }
  }

  window.KensLifeEmbed = {
    navigate,
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
