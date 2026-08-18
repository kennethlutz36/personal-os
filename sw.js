const CACHE='personal-os-v3-20260817-email-hotfix';
const CORE=[
  './','./index.html','./manifest.webmanifest','./icon.svg',
  './app/part-0.txt','./app/part-1.txt','./app/part-2.txt','./app/part-3.txt','./app/part-4.txt',
  './calendar-patch.js','./calendar-error-patch.js','./calendar-auto-patch.js',
  './whoop-patch.js','./health-patch.js','./ai-brief-patch.js','./production-patch.js',
  './email-patch.js','./email-v2-patch.js','./email-auto-sync.js'
];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(c=>Promise.allSettled(CORE.map(u=>c.add(u)))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  event.respondWith(fetch(event.request).then(response=>{
    const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy)).catch(()=>{});return response;
  }).catch(()=>caches.match(event.request).then(r=>r||caches.match('./index.html'))));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>{
    for(const client of clients){if('focus'in client)return client.focus()}
    if(self.clients.openWindow)return self.clients.openWindow('./');
  }));
});