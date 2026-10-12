import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { settings, hash, safeFile, rejectDiagnostics, validateManifest } from './release-contract.mjs';
import { verifyHTTPS } from './verify-https.mjs';

test('target/channel validation rejects credential URLs, wrong paths and unsupported bases', () => {
  assert.equal(settings({}).channel, 'release-candidate');
  assert.equal(settings({ WW_RELEASE_BASE: '/', WW_RELEASE_DIRECTORY: 'dist-owner-rc' }).site, null);
  for (const env of [{WW_RELEASE_BASE:'/bad/'},{WW_RELEASE_CHANNEL:'public-qa'},{WW_RELEASE_DIRECTORY:'/tmp'},{WW_RELEASE_URL:'https://user:pass@tonnutkit-dev.github.io/Weather-watch/'},{WW_RELEASE_URL:'https://example.com/Weather-watch/'},{WW_RELEASE_BASE:'/',WW_RELEASE_CHANNEL:'production'}]) assert.throws(() => settings(env));
});
test('distribution guard rejects traversal, diagnostic output and credential patterns', () => {
  for (const path of ['../secret','/assets/a.js','assets/../a.js','assets\\a.js','assets//a.js']) assert.throws(() => safeFile(path));
  for (const [path, body] of [['a.map','{}'],['.env','x'],['http-probe.html','x'],['a.js','window.__WW_HTTP={}'],['a.js','-----BEGIN PRIVATE KEY-----']]) assert.throws(() => rejectDiagnostics(path,Buffer.from(body)));
});
async function fixture(mode, run) {
  const assets = new Map([['index.html',Buffer.from('<!doctype html><html><body>RC TEST ONLY</body></html>')],['favicon.svg',Buffer.from('<svg/>')],['assets/maplibre-gl-worker-test.mjs',Buffer.from('export{}')],['assets/noto-sans-thai-thai-test.woff2',Buffer.from('TEST FONT')]]);
  let manifest;
  const server = createServer((req,res) => {
    const path = new URL(req.url,'http://local/').pathname.slice(1);
    if (mode==='redirect' && path==='index.html') {res.writeHead(302,{location:'https://example.com/'});res.end();return;}
    let bytes = assets.get(path);
    if (mode==='missing' && path.endsWith('.mjs')) bytes=undefined;
    if (!bytes) {res.writeHead(404);res.end();return;}
    if (mode==='stale' && path==='release.json' && !req.url.includes('?')) bytes=Buffer.from('{}');
    if (mode==='changed' && path==='favicon.svg') bytes=Buffer.from('<svg>changed</svg>');
    const mime=path.endsWith('.html')?'text/html':path.endsWith('.json')?'application/json':path.endsWith('.mjs')?'text/javascript':path.endsWith('.woff2')?'font/woff2':'image/svg+xml';
    res.writeHead(200,{'Content-Type':mode==='mime' && path.endsWith('.mjs')?'text/html':mime});res.end(bytes);
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const target='http://127.0.0.1:'+server.address().port+'/';
  const release={version:'0.3.0',commit:'a'.repeat(40),base:'/',site:target,channel:'release-candidate',diagnosticFixturesIncluded:false};
  assets.set('release.json',Buffer.from(JSON.stringify(release)));
  manifest={schema:1,source:{commit:release.commit,tree:'b'.repeat(40)},release,files:[...assets].map(([file,b])=>({file,bytes:b.length,sha256:hash(b)}))};
  try {await run(manifest,target);} finally {await new Promise(resolve=>server.close(resolve));}
}
test('full verifier admits exact bytes and rejects wrong source, version, duplicate paths and unbound targets',async()=>fixture('ok',async(m,u)=>{
  const result=await verifyHTTPS(m,u,{allowLoopback:true});assert.equal(result.records.length,m.files.length+4);
  assert.throws(()=>validateManifest({...m,release:{...m.release,version:'0.2.0'}}));
  assert.throws(()=>validateManifest({...m,source:{...m.source,commit:'c'.repeat(40)}}));
  assert.throws(()=>validateManifest({...m,files:[...m.files,m.files[0]]}));
  await assert.rejects(verifyHTTPS({...m,release:{...m.release,site:null}},u,{allowLoopback:true}),/bound/);
  await assert.rejects(verifyHTTPS(m,u),/HTTPS/);
}));
for (const mode of ['missing','changed','stale','mime','redirect']) test('full verifier rejects '+mode,async()=>fixture(mode,(m,u)=>assert.rejects(verifyHTTPS(m,u,{allowLoopback:true}))));
