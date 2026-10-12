import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const base='db854c5330512d23e3008507f6bcb115a05bdbf6';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
assert.equal(git('status','--porcelain=v1','--untracked-files=no'),'');
assert.equal(git('rev-parse','origin/main'),'2036e2ac788cb31d25fd387cb40520ad95c408a6');
assert.equal(git('rev-parse','origin/work/isolated-webkit-diagnosis-v03'),base);
assert.equal(git('rev-parse','origin/work/mobile-map-correction-v03'),'8ca9ae7afe67551d4a43de5ebf2fc0d47ec4c23a');
git('merge-base','--is-ancestor',base,'HEAD');
const exact=new Set(['package.json','package-lock.json','scripts/verify_pages_build.mjs','scripts/verify_live_pages.mjs','.github/workflows/pages.yml','.github/workflows/rc-v03.yml',
 'qa-rc-v03/tsconfig.json','qa-rc-v03/fs-shim.d.ts','qa-rc-v03/acceptance.spec.ts','qa-rc-v03/playwright.config.ts','qa-rc-v03/release.test.mjs','qa-rc-v03/release-contract.mjs','qa-rc-v03/artifact-manifest.mjs','qa-rc-v03/verify-https.mjs','qa-rc-v03/check-scope.mjs','qa-rc-v03/compare-builds.mjs']);
const files=git('diff','--name-only',base,'HEAD').split('\n').filter(Boolean);
for(const path of files)assert.ok(exact.has(path),'Unapproved path '+path);
for(const path of ['package.json','package-lock.json']){
 const old=JSON.parse(git('show',base+':'+path)),now=JSON.parse(readFileSync(path,'utf8'));
 assert.equal(now.version,'0.3.0');now.version=old.version;
 if(path==='package-lock.json'){assert.equal(now.packages[''].version,'0.3.0');now.packages[''].version=old.packages[''].version;}
 assert.deepEqual(now,old,'Only root version changes allowed: '+path);
}
git('diff','--exit-code',base,'HEAD','--','src','public','DESIGN.md','vite.config.ts','tests','playwright.config.ts','qa-provider-v03','qa-mobile-v03','qa-playback-v03','qa-smooth-v03','qa-visual-v03');
console.log('Scoped RC source invariant PASS',git('rev-parse','HEAD'),files);
