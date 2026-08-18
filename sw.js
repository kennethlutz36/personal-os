const PREFIX='personal-os';
self.addEventListener('install',event=>{event.waitUntil(self.skipWaiting());});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{try{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith(PREFIX)).map(k=>caches.delete(k)));}catch(e){}try{await self.registration.unregister();}catch(e){}})());});
