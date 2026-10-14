import {readFile,writeFile,mkdir,readdir,lstat,access,appendFile} from 'node:fs/promises';
import {execFileSync,spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {resolve,dirname,basename} from 'node:path';
import {pathToFileURL} from 'node:url';
import os from 'node:os';

export const PIN={parent:'001c796e8758746833c1353e088530238b23cbba',parentTree:'2c05025d4f0c6163ed8a526a50b09fd54347af71',
  candidate:'a19d53ac5587ded31b7e3cad6112f02c7621aeb6',candidateTree:'7288a8b5ced9025ff7c7679675aeeaaa8cf123ff',
  rc:'972c0e17243646f60dfb23ec40bdf556481c4bfc',main:'2036e2ac788cb31d25fd387cb40520ad95c408a6',
  runtime:'204577877fa644fbbf0cd145ce12aecaa5c9e4b543d5bf20c2066a8ffc06c147',
  branch:'work/unprivileged-native-control-v03',image:'20261004.327.1'};
export const FILES=['.github/workflows/native-control-v03.yml','qa-native-control-v03/collector.mjs','qa-native-control-v03/native-control.mjs'];
export const CELLS=['chromium-app','webkit-app','chromium-native','webkit-native'];
export const ORIGINAL={
  'qa-provider-v03/provider.spec.ts':'9201ec7237d51e06d6c7e4daa691a787c83b30b858102406eba5b909e7f2a1bf',
  'qa-provider-v03/playwright.config.ts':'309be25fab347cf0255bedf88e175e9e328abae55a21109c5e4a22ef60f1a3c2',
  'package-lock.json':'236dc925e4b076c1f090d6b6a00e9eef9564c6ac56d41e24c8679f263f64b8a0',
  'src/providers/http.ts':'545e21a62ebfa71451b04a9dcf52dd612711aeed35198373ae2d8cd04d942e03'};
export const hash=b=>createHash('sha256').update(b).digest('hex');
export function stopCode(error){
  if(['NODE_OS','RUNNER_IMAGE','LIBRARY_DRIFT','PLAYWRIGHT','REGISTRY_SOURCE','PLAYWRIGHT_SOURCE','REVISION','EXECUTABLE_REVISION','OS','PROXY','ENV_OVERRIDE'].includes(error?.message))return 'STOP_ENVIRONMENT';
  if(['PRIVACY','PATH','RAW_PATH','DELIVERY_PATH'].includes(error?.message))return 'STOP_PRIVACY';
  if(['EVENT_FILES','SUMMARY','ATTEMPTS','MISSING_PROVIDER'].includes(error?.message))return 'STOP_INCOMPLETE';
  return 'STOP_SCOPE_OR_INCOMPLETE';
}
const ok=(condition,code='SCOPE')=>{if(!condition)throw new Error(code);};
const keys=(o,wanted)=>ok(o && !Array.isArray(o) && Object.keys(o).sort().join('|')===[...wanted].sort().join('|'),'SCHEMA');
const hex=(v,n=64)=>ok(typeof v==='string' && new RegExp('^[a-f0-9]{'+n+'}$').test(v),'HASH');
const time=v=>ok(Number.isSafeInteger(v)&&v>=0&&v<=90000,'TIME');
export function safeFile(v){ok(typeof v==='string' && /^[a-z][a-z0-9-]*\.json$/.test(v) && !v.includes('..'),'PATH');return v;}
export function noCredentials(raw){ok(!/(?:Bearer\s+\S+|(?:ghp|github_pat)_[A-Za-z0-9_]{12,}|(?:cookie|authorization)["']?\s*[=:]\s*["']?[^\s,}"'\]]+|SYNTHETIC_PRIVATE)/i.test(raw),'PRIVACY');}
export function validateJobs(run,jobs,history,identity){
  ok(run.id===identity.run && run.head_sha===identity.qaSha && run.run_attempt===1 && run.event==='push' && run.head_branch===PIN.branch && run.path===FILES[0],'RUN');
  ok(Array.isArray(jobs)&&jobs.length===4,'JOBS');
  ok(new Set(jobs.map(x=>x.id)).size===4 && new Set(jobs.map(x=>x.name)).size===4,'JOBS');
  ok(jobs.every(x=>CELLS.some(c=>x.name===`native-evidence (${c})`) && x.run_attempt===1 && x.run_id===identity.run),'JOBS');
  ok(history.length===1 && history[0].id===identity.run && history[0].run_attempt===1 && history[0].head_sha===identity.qaSha,'RUN_HISTORY');
}
export function summaryRows(summary){
  const walk=suites=>suites.flatMap(s=>[...(s.specs||[]).flatMap(sp=>(sp.tests||[]).map(t=>({sp,t}))),...walk(s.suites||[])]);
  return walk(summary.suites||[]);
}
export function validateSelection(summary,engine,discovery){
  ok(['chromium','webkit'].includes(engine),'ENGINE');
  ok(Array.isArray(summary.errors)&&summary.errors.length===0,'SUMMARY');
  const rows=summaryRows(summary);ok(rows.length===1,'SELECTION');const {sp,t}=rows[0];
  ok(sp.title==='LIVE zero-retry original 45s temperature sample 1' && sp.file==='provider.spec.ts' && t.projectName===engine && t.timeout===90000 && t.expectedStatus==='passed','SELECTION');
  const c=summary.config,p=c.projects.find(x=>x.name===engine);
  ok(c.version==='1.64.0'&&c.workers===1&&c.maxFailures===0&&p.retries===0&&p.repeatEach===1&&p.timeout===90000,'TEST_CONFIG');
  ok(Array.isArray(t.results)&&t.results.length===(discovery?0:1),'ATTEMPTS');
  if(!discovery)ok(t.results[0].retry===0&&['passed','failed','timedOut'].includes(t.results[0].status),'ATTEMPTS');
  return rows[0];
}
export function validateNative(rows){
  ok(Array.isArray(rows)&&rows.length===2&&rows.map(x=>x.provider).join(',')==='WEATHER,AQI','NATIVE');
  const fields=['provider','requestMs','headersMs','jsonMs','deadlineMs','statusClass','outcome','aborted','operationSettled','valid'];
  for(const r of rows){
    keys(r,fields);time(r.requestMs);for(const k of ['headersMs','jsonMs','deadlineMs'])if(r[k]!==null)time(r[k]);
    ok(['NONE','1xx','2xx','3xx','4xx','5xx'].includes(r.statusClass),'STATUS');
    ok(['VALID_JSON','MISSING_FIELD','HTTP_ERROR','JSON_REJECTED','FETCH_REJECTED','DEADLINE'].includes(r.outcome),'OUTCOME');
    for(const k of ['aborted','operationSettled','valid'])ok(typeof r[k]==='boolean','BOOLEAN');
    if(r.headersMs!==null)ok(r.headersMs>=r.requestMs,'ORDER');
    if(r.jsonMs!==null)ok(r.headersMs!==null&&r.jsonMs>=r.headersMs,'ORDER');
    if(r.outcome==='DEADLINE')ok(r.aborted&&r.deadlineMs!==null&&r.deadlineMs-r.requestMs>=11990&&!r.valid,'DEADLINE');
    else ok(r.deadlineMs===null&&!r.aborted&&r.operationSettled,'COMPLETION');
    if(['VALID_JSON','MISSING_FIELD'].includes(r.outcome))ok(r.statusClass==='2xx'&&r.jsonMs!==null,'JSON_STAGE');
    if(r.outcome==='JSON_REJECTED')ok(r.headersMs!==null&&r.statusClass==='2xx'&&r.jsonMs===null,'JSON_STAGE');
    if(r.outcome==='HTTP_ERROR')ok(r.headersMs!==null&&r.statusClass!=='2xx'&&r.jsonMs===null,'HTTP_STAGE');
    if(r.outcome==='DEADLINE')ok(r.jsonMs===null,'DEADLINE_STAGE');
    if(r.outcome==='VALID_JSON')ok(r.valid&&r.statusClass==='2xx'&&r.jsonMs!==null,'VALIDITY');
    else ok(!r.valid,'VALIDITY');
  } return rows;
}
export function deriveEvents(raw,endpoints,max){
  noCredentials(JSON.stringify(raw));ok(raw&&Array.isArray(raw.network),'EVENTS');
  const out=endpoints.map(x=>({provider:x.provider,starts:0,events:[]}));
  for(const r of raw.network){
    const i=endpoints.findIndex(x=>x.url===r.url);ok(i>=0,'ENDPOINT');
    ok(['request','response','finished','failed'].includes(r.event),'EVENT');time(r.at);
    if(r.event==='request'){ok(r.method==='GET','METHOD');out[i].starts++;ok(out[i].starts<=max,'START_CAP');}
    let statusClass='NONE';if(r.event==='response'){ok(Number.isInteger(r.status)&&r.status>=100&&r.status<=599,'STATUS');statusClass=Math.floor(r.status/100)+'xx';}
    out[i].events.push({event:r.event,atMs:r.at,statusClass});ok(out[i].events.length<=max*4,'EVENT_CAP');
  }
  ok(out.every(x=>x.starts>=1),'MISSING_PROVIDER');return out;
}
function validateProviders(rows,max){
  ok(Array.isArray(rows)&&rows.length===2&&rows.map(x=>x.provider).join(',')==='WEATHER,AQI','PROVIDERS');
  for(const r of rows){keys(r,['provider','starts','events']);ok(Number.isInteger(r.starts)&&r.starts>=1&&r.starts<=max,'START_CAP');
    ok(Array.isArray(r.events)&&r.events.length>=r.starts&&r.events.length<=max*4,'EVENT_CAP');
    ok(r.events.filter(e=>e.event==='request').length===r.starts,'START_CAP');
    for(const e of r.events){keys(e,['event','atMs','statusClass']);ok(['request','response','finished','failed'].includes(e.event),'EVENT');time(e.atMs);ok(['NONE','1xx','2xx','3xx','4xx','5xx'].includes(e.statusClass),'STATUS');}
  }
}
export function validateDocument(doc){
  keys(doc,['schema','identity','environment','sources','observation','classification']);ok(doc.schema===1&&doc.classification==='DIAGNOSTIC_ONLY','DOCUMENT');
  const i=doc.identity;keys(i,['run','attempt','cell','qaSha','qaTree','parent','candidate','runtime']);
  ok(Number.isSafeInteger(i.run)&&i.run>0&&i.attempt===1&&CELLS.includes(i.cell),'IDENTITY');hex(i.qaSha,40);hex(i.qaTree,40);
  ok(i.parent===PIN.parent&&i.candidate===PIN.candidate&&i.runtime===PIN.runtime,'IDENTITY');
  const env=doc.environment;keys(env,['image','kernel','node','playwright','browserRevision','entrySha256','libs']);
  ok(env.image===PIN.image&&env.kernel==='6.17.0-1022-azure'&&env.node==='v24.21.0'&&env.playwright==='1.64.0'&&env.browserRevision===(i.cell.startsWith('chromium')?'1248':'2370'),'ENVIRONMENT');hex(env.entrySha256);
  keys(env.libs,['libsoup-3.0-0','glib-networking','libgtk-4-1']);
  ok(env.libs['libsoup-3.0-0']==='3.4.4-5ubuntu0.9'&&env.libs['glib-networking']==='2.80.0-1build1'&&env.libs['libgtk-4-1']==='4.14.5+ds-0ubuntu0.10','LIBRARY_DRIFT');
  keys(doc.sources,[...FILES,...Object.keys(ORIGINAL)]);for(const [p,v] of Object.entries(doc.sources)){hex(v);if(ORIGINAL[p])ok(v===ORIGINAL[p],'SOURCE');}
  const o=doc.observation;keys(o,['status','testDurationMs','providers','native']);
  ok(['PASSED','FAILED'].includes(o.status),'OBSERVATION');time(o.testDurationMs);const native=i.cell.endsWith('native');
  validateProviders(o.providers,native?1:2);
  if(native){validateNative(o.native);ok(o.status===(o.native.every(x=>x.outcome==='VALID_JSON')?'PASSED':'FAILED'),'OBSERVATION');}
  else ok(o.native===null,'APP');
  noCredentials(JSON.stringify(doc));return doc;
}
export function validateCohort(docs){
  ok(Array.isArray(docs)&&docs.length===4&&new Set(docs.map(x=>x.identity?.cell)).size===4,'COHORT');docs.forEach(validateDocument);
  for(const k of ['run','qaSha','qaTree','parent','candidate','runtime'])ok(new Set(docs.map(x=>x.identity[k])).size===1,'COHORT_IDENTITY');
  ok(new Set(docs.map(x=>JSON.stringify(x.sources))).size===1,'COHORT_SOURCE');
  ok(docs.flatMap(x=>x.observation.providers).reduce((n,x)=>n+x.starts,0)<=12,'TOTAL_CAP');
  return 'DIAGNOSTIC_ONLY_NOT_RELEASE_GATE';
}

const root=process.cwd(),product='/tmp/ww-native-product',priv='/tmp/ww-native-private';
const privatePath=name=>resolve(priv,name);
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const readJSON=async p=>JSON.parse(await readFile(p,'utf8'));
const save=async(p,o)=>writeFile(p,JSON.stringify(o,null,2)+'\n',{mode:0o600});
async function api(path){
  ok(process.env.GH_TOKEN&&process.env.GITHUB_REPOSITORY==='tonnutkit-dev/Weather-watch','API_AUTH');
  const r=await fetch('https://api.github.com/repos/tonnutkit-dev/Weather-watch/'+path,{headers:{Authorization:'Bearer '+process.env.GH_TOKEN,Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(15000)});
  ok(r.ok,'API_READ');return r.json();
}
async function publication(){
  ok(process.version==='v24.21.0'&&process.platform==='linux'&&process.arch==='x64','NODE_OS');
  const e=process.env;ok(e.GITHUB_ACTIONS==='true'&&e.GITHUB_EVENT_NAME==='push'&&e.GITHUB_REF_NAME===PIN.branch&&e.GITHUB_RUN_ATTEMPT==='1','EVENT');
  ok(CELLS.includes(e.WW_CELL)&&e.WW_CELL===e.WW_ENGINE+'-'+e.WW_SURFACE,'CELL');
  for(const k of Object.keys(e))if(/^(VITE_|PLAYWRIGHT_|WW_DIAG_)/.test(k)||['NODE_OPTIONS','PWDEBUG','DEBUG','WW_RC_ROOT','WW_RELEASE_BASE','WW_RELEASE_URL','WW_RELEASE_DIRECTORY'].includes(k))ok(!e[k],'ENV_OVERRIDE');
  for(const k of Object.keys(e))if(/^(?:http|https|all|no)_proxy$/i.test(k)||k==='NODE_USE_ENV_PROXY')ok(!e[k],'PROXY');
  const head=git(root,'rev-parse','HEAD');ok(head===e.GITHUB_SHA&&git(root,'rev-parse','HEAD^')===PIN.parent,'QA_IDENTITY');
  ok(git(root,'rev-parse',PIN.parent+'^{tree}')===PIN.parentTree&&git(root,'status','--porcelain=v1','--untracked-files=no')==='','QA_TREE');
  ok(git(root,'diff','--name-status',PIN.parent,'HEAD').split('\n').sort().join('|')===FILES.map(p=>'A\t'+p).sort().join('|'),'EXACT_PATHS');
  const sources={};for(const p of FILES){const b=await readFile(resolve(root,p));ok(hash(b)===hash(execFileSync('git',['show','HEAD:'+p],{cwd:root})),'QA_SOURCE');sources[p]=hash(b);}
  const identity={run:Number(e.GITHUB_RUN_ID),attempt:1,cell:e.WW_CELL,qaSha:head,qaTree:git(root,'rev-parse','HEAD^{tree}'),parent:PIN.parent,candidate:PIN.candidate,runtime:PIN.runtime};
  const [run,jobs,history]=await Promise.all([api('actions/runs/'+identity.run),api('actions/runs/'+identity.run+'/jobs?filter=all&per_page=100'),api('actions/runs?branch='+encodeURIComponent(PIN.branch)+'&per_page=100')]);
  ok(jobs.total_count===4&&history.total_count===1,'JOB_RUN_COUNT');validateJobs(run,jobs.jobs,history.workflow_runs,identity);
  for(const [b,s] of [['main',PIN.main],['work/release-candidate-v03-01',PIN.rc],['work/chromium-targeted-lab-v03',PIN.candidate],['work/strict-live-candidate-gate-v03',PIN.parent],[PIN.branch,head]]){
    const r=await api('git/ref/heads/'+b);ok(r.object.sha===s,'REF_DRIFT');
  }
  const prior=await api('actions/runs?branch=work%2Fstrict-live-candidate-gate-v03&per_page=100');
  ok(prior.total_count===4&&prior.workflow_runs.map(x=>x.id).sort().join(',')===[38540581252,38526358197,38522725800,38518716897].sort().join(',')&&prior.workflow_runs.every(x=>x.run_attempt===1),'PRIOR_HISTORY');
  return {identity,sources};
}
async function sourceGuard(){
  ok(git(product,'rev-parse','HEAD')===PIN.candidate&&git(product,'rev-parse','HEAD^{tree}')===PIN.candidateTree&&git(product,'status','--porcelain=v1','--untracked-files=no')==='','PRODUCT');
  const sources={};for(const [p,s] of Object.entries(ORIGINAL)){ok(hash(await readFile(resolve(product,p)))===s,'ORIGINAL_SOURCE');sources[p]=s;}return sources;
}
export async function runtimeGuard(source=product){
  const {inventory}=await import(pathToFileURL(resolve(source,'qa-rc-v03/release-contract.mjs')));
  const all=await inventory(resolve(source,'dist'));const runtime=all.filter(x=>x.file!=='release.json');
  ok(runtime.length===35&&hash(JSON.stringify(runtime))===PIN.runtime,'RUNTIME');
  const r=await readJSON(resolve(source,'dist/release.json'));
  ok(r.commit===PIN.candidate&&r.base==='/Weather-watch/'&&r.channel==='release-candidate'&&r.diagnosticFixturesIncluded===false,'RELEASE');
}
async function environmentGuard(require){
  ok(process.env.ImageOS==='ubuntu24'&&process.env.ImageVersion===PIN.image&&os.release()==='6.17.0-1022-azure','RUNNER_IMAGE');
  const osReleaseText=await readFile('/etc/os-release','utf8');ok(/^ID=ubuntu$/m.test(osReleaseText)&&/^VERSION_ID="24\.04"$/m.test(osReleaseText),'OS');
  const libs={};for(const p of ['libsoup-3.0-0','glib-networking','libgtk-4-1'])libs[p]=execFileSync('dpkg-query',['-W','-f=${Version}',p],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  ok(libs['libsoup-3.0-0']==='3.4.4-5ubuntu0.9'&&libs['glib-networking']==='2.80.0-1build1'&&libs['libgtk-4-1']==='4.14.5+ds-0ubuntu0.10','LIBRARY_DRIFT');
  ok(require('playwright/package.json').version==='1.64.0','PLAYWRIGHT');
  ok(hash(await readFile(resolve(product,'node_modules/playwright-core/browsers.json')))==='2cfd419f71ac6475d81e1301fa86c34cf2a2a6bae2a0da4b5a2b18310216b6bf','REGISTRY_SOURCE');
  ok(hash(await readFile(resolve(product,'node_modules/playwright-core/lib/coreBundle.js')))==='2325ca4c1c83070e89dc49fb82525508f0a68e0cf12e2a624277968da216b7e0','PLAYWRIGHT_SOURCE');
  const registry=await readJSON(resolve(product,'node_modules/playwright-core/browsers.json'));
  for(const [n,r] of [['chromium','1248'],['chromium-headless-shell','1248'],['webkit','2370']])ok(registry.browsers.find(x=>x.name===n)?.revision===r,'REVISION');
  const pw=require('playwright'),engine=process.env.WW_ENGINE;let entry=pw[engine].executablePath();
  if(engine==='chromium')entry=resolve(dirname(dirname(dirname(entry))),'chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell');
  ok(entry.includes(engine==='chromium'?'chromium_headless_shell-1248':'webkit-2370'),'EXECUTABLE_REVISION');await access(entry);
  return {image:PIN.image,kernel:os.release(),node:process.version,playwright:'1.64.0',browserRevision:engine==='chromium'?'1248':'2370',entrySha256:hash(await readFile(entry)),libs};
}
export async function originalEndpoints(require,source=product){
  const esbuild=require('esbuild');
  const built=await esbuild.build({stdin:{contents:"export {weatherUrl} from './src/providers/weather';export {airQualityUrl} from './src/providers/airQuality';export {defaultLocation} from './src/locations/provinces';",resolveDir:source},bundle:true,write:false,platform:'node',format:'esm',define:{'import.meta.env':'{}'},metafile:true});
  ok(!Object.keys(built.metafile.inputs).some(p=>/node_modules|App\.tsx|QueryClient|MapCanvas/.test(p)),'URL_BUNDLE');
  const f=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
  const rows=[{provider:'WEATHER',url:f.weatherUrl(f.defaultLocation)},{provider:'AQI',url:f.airQualityUrl(f.defaultLocation)}];
  for(const [i,x] of rows.entries()){const u=new URL(x.url);ok(u.protocol==='https:'&&!u.port&&!u.username&&!u.password&&!u.hash&&u.hostname===(i===0?'api.open-meteo.com':'air-quality-api.open-meteo.com'),'ENDPOINT');}return rows;
}
async function child(command,args,env,log,timeout=100000,cwd=product){
  const fd=(await import('node:fs')).openSync(log,'w',0o600);
  try{return await new Promise(resolve=>{const p=spawn(command,args,{cwd,env,stdio:['ignore',fd,fd],timeout});p.on('error',()=>resolve({code:null,signal:'SPAWN_ERROR'}));p.on('exit',(code,signal)=>resolve({code,signal}));});}
  finally{(await import('node:fs')).closeSync(fd);}
}
async function onlyEventFile(dir){
  const found=[];async function walk(d){for(const e of await readdir(d)){const p=resolve(d,e),s=await lstat(p);ok(!s.isSymbolicLink(),'RAW_PATH');if(s.isDirectory())await walk(p);else if(basename(p)==='provider-events.json')found.push(p);}}
  await walk(dir);ok(found.length===1,'EVENT_FILES');return found[0];
}
async function appCase(require,endpoints){
  const out=privatePath('browser');const summary=privatePath('summary.json'),engine=process.env.WW_ENGINE;
  const env={...process.env,GITHUB_SHA:PIN.candidate,WW_DIAG_CONTROL:'1',WW_DIAG_SIGNALS:'',WW_DIAG_PUBLIC_URL:'',PLAYWRIGHT_JSON_OUTPUT_FILE:summary};delete env.GH_TOKEN;
  const args=['test','--config','qa-provider-v03/playwright.config.ts','--project',engine,'--grep','LIVE zero-retry original 45s temperature sample 1$','--workers','1','--retries','0','--repeat-each','1','--max-failures','0','--output',out,'--reporter','list,json'];
  const cli=resolve(product,'node_modules/playwright/cli.js');
  let exit=await child(process.execPath,[cli,...args,'--list'],env,privatePath('discovery.log'),60000);ok(exit.code===0&&!exit.signal,'DISCOVERY');validateSelection(await readJSON(summary),engine,true);
  exit=await child(process.execPath,[cli,...args],env,privatePath('test.log'));ok(!exit.signal&&[0,1].includes(exit.code),'APP_PROCESS');
  const selected=validateSelection(await readJSON(summary),engine,false),r=selected.t.results[0];ok((exit.code===0)===(r.status==='passed'),'APP_EXIT');
  const raw=await readJSON(await onlyEventFile(out));
  ok(raw.instrumentedSignals===false&&raw.scope==='source: unmodified production build'&&raw.browser===engine&&raw.test===selected.sp.title,'APP_INSTRUMENTATION');
  const observation={status:r.status==='passed'?'PASSED':'FAILED',testDurationMs:r.duration,providers:deriveEvents(raw,endpoints,2),native:null};
  return observation;
}
async function nativeCase(require,endpoints){
  const pw=require('playwright'),engine=process.env.WW_ENGINE;
  const server=createServer((req,res)=>{if(req.url!=='/Weather-watch/'){res.writeHead(404);res.end();return;}res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Native diagnostic</title><body></body></html>');});
  await new Promise((yes,no)=>{server.once('error',no);server.listen(4173,'127.0.0.1',yes);});let browser;
  try{
    browser=await pw[engine].launch();const context=await browser.newContext({viewport:{width:375,height:667},isMobile:true,hasTouch:true});const page=await context.newPage();
    const events=[];let violation=false;const started=Date.now();
    page.on('request',r=>{if(new URL(r.url()).origin==='http://127.0.0.1:4173')return;
      if(!endpoints.some(x=>x.url===r.url())||r.method()!=='GET')violation=true;
      events.push({event:'request',at:Date.now()-started,url:r.url(),method:r.method()});if(events.filter(x=>x.event==='request'&&x.url===r.url()).length>1)violation=true;});
    page.on('response',r=>{if(endpoints.some(x=>x.url===r.url()))events.push({event:'response',at:Date.now()-started,url:r.url(),status:r.status()});});
    page.on('requestfinished',r=>{if(endpoints.some(x=>x.url===r.url()))events.push({event:'finished',at:Date.now()-started,url:r.url()});});
    page.on('requestfailed',r=>{if(endpoints.some(x=>x.url===r.url()))events.push({event:'failed',at:Date.now()-started,url:r.url()});});
    await page.goto('http://127.0.0.1:4173/Weather-watch/');ok(new URL(page.url()).origin==='http://127.0.0.1:4173','ORIGIN');
    const source=await readFile(resolve(root,FILES[2]),'utf8');const compiled=(await require('esbuild').transform(source,{format:'iife',globalName:'NATIVE_CONTROL',platform:'browser',target:'es2022'})).code;
    await page.addScriptTag({content:compiled});
    const rows=await page.evaluate(endpoints=>globalThis.NATIVE_CONTROL.runNativeControl(endpoints),endpoints);
    ok(!violation,'NATIVE_REQUEST_SCOPE');validateNative(rows);
    return {status:rows.every(x=>x.outcome==='VALID_JSON')?'PASSED':'FAILED',testDurationMs:Date.now()-started,providers:deriveEvents({network:events},endpoints,1),native:rows};
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
async function prepare(){
  await mkdir(priv,{recursive:false,mode:0o700});const record=await publication();
  git(root,'clone','--no-hardlinks','--no-checkout',root,product);git(product,'checkout','--detach',PIN.candidate);
  record.sources={...record.sources,...await sourceGuard()};await save(privatePath('prepared.json'),record);
}
export async function buildAndVerify(source,directory,eventSha){
  const parentSha=process.env.GITHUB_SHA;
  ok(eventSha===parentSha&&/^[a-f0-9]{40}$/.test(eventSha)&&eventSha!==PIN.candidate,'BUILD_EVENT');
  ok(git(source,'rev-parse','HEAD')===PIN.candidate&&git(source,'rev-parse','HEAD^{tree}')===PIN.candidateTree&&git(source,'status','--porcelain=v1','--untracked-files=no')==='','PRODUCT');
  const env={...process.env,GITHUB_SHA:PIN.candidate,WW_RELEASE_CHANNEL:'release-candidate'};delete env.GH_TOKEN;
  const built=await child('npm',['run','build'],env,resolve(directory,'build.log'),100000,source);
  ok(built.code===0&&!built.signal,'BUILD');
  const release=resolve(source,'dist/release.json');
  async function absent(){try{await access(release);}catch(error){ok(error?.code==='ENOENT','METADATA_ACCESS');return;}throw new Error('STALE_METADATA');}
  await absent();
  const negativeLog=resolve(directory,'verify-negative.log');
  const negative=await child('npm',['run','verify:pages'],{...env,GITHUB_SHA:eventSha},negativeLog,60000,source);
  ok(negative.code===1&&!negative.signal&&(await readFile(negativeLog,'utf8')).includes('CI SHA must match actual checkout'),'IDENTITY_NEGATIVE');
  await absent();
  const positive=await child('npm',['run','verify:pages'],env,resolve(directory,'verify-positive.log'),60000,source);
  ok(positive.code===0&&!positive.signal,'IDENTITY_POSITIVE');
  await runtimeGuard(source);
  ok(process.env.GITHUB_SHA===parentSha,'PARENT_EVENT');
  const proof={eventSha:parentSha,productSha:PIN.candidate,negativeExit:negative.code,positiveExit:positive.code,releaseCreated:true,runtime:PIN.runtime,parentUnchanged:true};
  await save(resolve(directory,'build-identity-proof.json'),proof);return proof;
}
async function build(){
  const current=await publication(),prepared=await readJSON(privatePath('prepared.json'));
  ok(JSON.stringify(current.identity)===JSON.stringify(prepared.identity),'IDENTITY');await sourceGuard();
  const env={...process.env};delete env.GH_TOKEN;
  const installed=await child('npm',['ci'],env,privatePath('npm.log'));
  ok(installed.code===0&&!installed.signal,'DEPENDENCIES');
  await buildAndVerify(product,priv,process.env.GITHUB_SHA);await sourceGuard();
}
async function collect(){
  const before=await publication(),prepared=await readJSON(privatePath('prepared.json'));
  ok(JSON.stringify(before.identity)===JSON.stringify(prepared.identity),'IDENTITY');
  const original=await sourceGuard();ok(JSON.stringify({...before.sources,...original})===JSON.stringify(prepared.sources),'SOURCE');
  await runtimeGuard();const require=createRequire(resolve(product,'package.json'));const environment=await environmentGuard(require);
  const endpoints=await originalEndpoints(require);
  const observation=process.env.WW_SURFACE==='app'?await appCase(require,endpoints):await nativeCase(require,endpoints);
  await runtimeGuard();await sourceGuard();const after=await publication();ok(JSON.stringify(after)===JSON.stringify(before),'POST_IDENTITY');
  const doc={schema:1,identity:before.identity,environment,sources:prepared.sources,observation,classification:'DIAGNOSTIC_ONLY'};
  validateDocument(doc);await save(privatePath('derived.json'),doc);
  if(observation.status!=='PASSED')process.exitCode=1;
}
async function finalize(){
  const current=await publication(),doc=validateDocument(await readJSON(privatePath('derived.json')));
  ok(JSON.stringify(current.identity)===JSON.stringify(doc.identity),'FINAL_IDENTITY');
  for(const p of FILES)ok(current.sources[p]===doc.sources[p],'FINAL_SOURCE');await runtimeGuard();await sourceGuard();
  const dir=resolve(root,'qa-native-control-v03/delivery');await mkdir(dir,{recursive:false,mode:0o700});
  const name=safeFile('evidence.json'),bytes=Buffer.from(JSON.stringify(doc,null,2)+'\n');
  await writeFile(resolve(dir,name),bytes,{mode:0o600});
  const manifest={schema:1,classification:'DIAGNOSTIC_ONLY',run:doc.identity.run,attempt:1,cell:doc.identity.cell,files:[{file:name,bytes:bytes.length,sha256:hash(bytes)}]};
  await save(resolve(dir,safeFile('manifest.json')),manifest);
  ok((await readdir(dir)).sort().join(',')==='evidence.json,manifest.json','DELIVERY_PATH');
  if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,'safe_delivery=true\n');
  console.log('SAFE_DIAGNOSTIC_EVIDENCE_READY');
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const commands={prepare,build,collect,finalize};
  try{ok(Object.hasOwn(commands,process.argv[2]),'COMMAND');await commands[process.argv[2]]();}
  catch(error){console.error(stopCode(error));process.exitCode=1;}
}
