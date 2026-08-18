(()=>{'use strict';
if(window.__interactionSafeLoaderV8)return;window.__interactionSafeLoaderV8=1;
const modules=['life-v7.js','finance-interactive-v7.js','health-interactive-v7.js'];
const status={};window.PersonalOSInteractionStatus=status;
function notice(msg,tone='info'){try{console[tone==='error'?'error':'log']('[Personal OS interactions]',msg)}catch{}}
async function boot(){
  if(typeof state==='undefined'||typeof render!=='function'||!window.PersonalOSData||!document.getElementById('content')){setTimeout(boot,350);return;}
  if(window.__interactionV8Booted)return;window.__interactionV8Booted=1;
  const originalRoute=state.route||'overview';
  for(const name of modules){
    const priorRender=render;
    try{
      const r=await fetch(name+'?iv8='+Date.now(),{cache:'no-store'});
      if(!r.ok)throw new Error(name+' HTTP '+r.status);
      const code=await r.text();
      new Function(code+'\n//# sourceURL='+name)();
      const installedRender=render;
      state.route='overview';
      installedRender();
      state.route=originalRoute;
      installedRender();
      status[name]={ok:true,at:new Date().toISOString()};
      notice(name+' loaded');
    }catch(e){
      try{render=priorRender;state.route=originalRoute;priorRender()}catch{}
      status[name]={ok:false,error:String(e&&e.message?e.message:e),at:new Date().toISOString()};
      notice(name+' disabled safely: '+status[name].error,'error');
    }
  }
  try{state.route=originalRoute;render()}catch(e){notice('final render recovered: '+(e?.message||e),'error')}
  window.dispatchEvent(new CustomEvent('personal-os-interactions-ready',{detail:status}));
}
setTimeout(boot,1200);
})();
