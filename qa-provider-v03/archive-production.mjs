import {mkdir,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const root='https://tonnutkit-dev.github.io/Weather-watch/';const known='2036e2ac788cb31d25fd387cb40520ad95c408a6';
const out='qa-provider-v03/rollback-public';await mkdir(out,{recursive:true});
const records=[];const queue=['index.html','release.json','favicon.svg'];const seen=new Set();
const get=async file=>{const r=await fetch(root+(file==='index.html'?'':file),{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Error(file+' HTTP'+r.status);return Buffer.from(await r.arrayBuffer());};
const manifest=JSON.parse((await get('release.json')).toString());if(manifest.commit!==known)throw new Error('Production source changed; STOP');
while(queue.length){const f=queue.shift();if(seen.has(f))continue;seen.add(f);if(!/^(index\.html|release\.json|favicon\.svg|assets\/[\w.-]+)$/.test(f))throw new Error('Unsafe artifact ref:'+f);
 const b=await get(f);await mkdir(out+'/'+f.split('/').slice(0,-1).join('/'),{recursive:true});await writeFile(out+'/'+f,b);records.push({file:f,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});
 if(/\.(html|css|js|mjs)$/.test(f)){const text=b.toString();for(const m of text.matchAll(/assets\/[\w.-]+/g))queue.push(m[0]);for(const m of text.matchAll(/(?:url\(["']?(?:\.\/)?|["']\.\/)([\w.-]+\.(?:woff2?|css|js|mjs|svg|png))/g))queue.push('assets/'+m[1]);}
}
const after=JSON.parse((await get('release.json')).toString());if(after.commit!==known||after.builtAt!==manifest.builtAt)throw new Error('Production changed during archive; STOP');
await writeFile(out+'/PUBLIC_ARCHIVE_INDEX.json',JSON.stringify({capturedAt:new Date().toISOString(),url:root,release:manifest,scope:'Actual public reachable build bytes, transitive textual asset references; not a provider tile/offline cache or proof of unreferenced build files. Source release checked before and after.',files:records},null,2));console.log('Captured known-good public output',records.length,'files at',known);
