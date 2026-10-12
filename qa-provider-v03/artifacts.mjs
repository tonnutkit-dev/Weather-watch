import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const sha=b=>createHash('sha256').update(b).digest('hex');
const root=resolve('dist');const files=[];
async function walk(dir){for(const f of await readdir(dir,{withFileTypes:true})){const p=dir+'/'+f.name;if(f.isDirectory())await walk(p);else files.push(p.slice(root.length+1));}}
await walk(root);const entries=[];
for(const f of files){const b=await readFile(root+'/'+f);if(/\.map$|fixture|diagnostic|qa-provider/i.test(f))throw new Error('Diagnostic/source-map output:'+f);
 if(/\.(js|mjs|html)$/.test(f)&&/__WW_QUERY_CLIENT|__WW_QUERY_EVENTS|__WW_FETCH_EVENTS|provider-fixtures\.json/.test(b.toString()))throw new Error('Test hooks shipped:'+f);
 entries.push({file:f,bytes:b.length,sha256:sha(b)});}
const release=JSON.parse(await readFile(root+'/release.json','utf8'));if(release.base!=='/Weather-watch/'||release.commit!==process.env.GITHUB_SHA)throw new Error('Wrong immutable Pages identity');
await mkdir('qa-provider-v03/artifacts',{recursive:true});await writeFile('qa-provider-v03/artifacts/candidate-files.json',JSON.stringify({scope:'True default-base production build. Test observers are separately built and excluded.',release,files:entries},null,2));
console.log('Verified diagnostic exclusion and immutable Pages artifact',release.commit,entries.length,'files');
