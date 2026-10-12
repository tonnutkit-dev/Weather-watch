import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {inventory} from './release-contract.mjs';
const before=process.env.WW_RC_BEFORE_DIST||'/tmp/ww-rc-before/dist';
const left=await inventory(before),right=await inventory('dist');
const assetsLeft=left.filter(x=>x.file.startsWith('assets/')),assetsRight=right.filter(x=>x.file.startsWith('assets/'));
assert.deepEqual(assetsRight,assetsLeft,'Metadata-only RC must retain all application asset bytes');
async function size(dir,files){let jsRaw=0,jsGzip=0,cssRaw=0;for(const f of files){if(/\.(js|mjs)$/.test(f.file)){const b=await readFile(dir+'/'+f.file);jsRaw+=b.length;jsGzip+=gzipSync(b).length;}if(f.file.endsWith('.css'))cssRaw+=f.bytes;}return{jsRaw,jsGzip,cssRaw};}
const result={beforeSource:'db854c5330512d23e3008507f6bcb115a05bdbf6',before:await size(before,left),after:await size('dist',right),applicationAssetsByteIdentical:true,scope:'Same CI runner and dependencies, including worker; release metadata excluded from runtime asset equality.'};
await mkdir('qa-rc-v03/artifacts',{recursive:true});await writeFile('qa-rc-v03/artifacts/bundle-comparison.json',JSON.stringify(result,null,2));console.log(result);
