import { readdir, readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const dist=path.resolve('dist');
const assets=(await readdir(path.join(dist,'assets'))).filter(name=>/\.(js|css)$/.test(name)).map(name=>'/assets/'+name);
const revision=createHash('sha256').update(await readFile(path.join(dist,'index.html'))).digest('hex').slice(0,12);
const files=['/','/index.html','/manifest.webmanifest','/seva-icon.svg',...assets];
// These entry points also work on hosts without an SPA rewrite configured.
for(const route of ['admin','volunteer','verify-email']){
  await mkdir(path.join(dist,route),{recursive:true});
  await copyFile(path.join(dist,'index.html'),path.join(dist,route,'index.html'));
}
await writeFile(path.join(dist,'sw.js'),`
const CACHE=${JSON.stringify('seva-shell-'+revision)};
const SHELL=${JSON.stringify(files)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('seva-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 if(event.request.mode==='navigate'){
  event.respondWith(fetch(event.request).catch(()=>caches.open(CACHE).then(cache=>cache.match('/index.html'))));return;
 }
 if(SHELL.includes(url.pathname))event.respondWith(caches.open(CACHE).then(cache=>cache.match(url.pathname)).then(cached=>cached||fetch(event.request)));
});
`);
console.log('Offline app shell generated. Auth, reports, APIs and map tiles are never cached by the service worker.');
