/* Service worker v5: cache-first (stale-while-revalidate) so the app opens instantly and fully offline */
var CACHE='snooker-v53';
var SHELL=['./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png','./icons/apple-touch-icon.png'];
function clean(res){ /* a redirected response cannot be served for a navigation */
  if(!res.redirected)return Promise.resolve(res);
  return res.clone().blob().then(function(b){return new Response(b,{status:200,statusText:'OK',headers:res.headers});});
}
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){
    return Promise.all(SHELL.map(function(u){
      return fetch(u,{cache:'reload'}).then(clean).then(function(r){if(r.ok)return c.put(u,r);});
    }));
  }).then(function(){return self.skipWaiting();}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
  }).then(function(){return self.clients.claim();}));
});
self.addEventListener('fetch',function(e){
  var req=e.request;
  if(req.method!=='GET')return;
  var url=new URL(req.url);
  if(url.origin!==location.origin)return;
  var nav=req.mode==='navigate';
  var key=nav?new Request(new URL('index.html',location).href):req;
  e.respondWith(
    caches.open(CACHE).then(function(c){
      return c.match(key,{ignoreSearch:true}).then(function(hit){
        var net=fetch(req).then(clean).then(function(res){
          if(res&&res.ok)c.put(key,res.clone());
          return res;
        }).catch(function(){return null;});
        if(hit){e.waitUntil(net);return hit;}
        return net.then(function(res){return res||c.match(new URL('index.html',location).href)||new Response('Hors ligne',{status:503});});
      });
    })
  );
});
