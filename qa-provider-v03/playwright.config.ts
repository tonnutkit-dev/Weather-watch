import {defineConfig} from '@playwright/test';
const publicURL=process.env.WW_DIAG_PUBLIC_URL;
const control=process.env.WW_DIAG_CONTROL==='1';
export default defineConfig({testDir:'.',testMatch:'provider.spec.ts',workers:1,retries:0,timeout:90000,expect:{timeout:10000},
 reporter:[['list'],['json',{outputFile:'qa-provider-v03/results/summary.json'}],['html',{outputFolder:'qa-provider-v03/report',open:'never'}]],outputDir:'qa-provider-v03/results',
 use:{baseURL:publicURL||'http://127.0.0.1:4173/Weather-watch/',viewport:{width:375,height:667},isMobile:true,hasTouch:true,trace:'on',screenshot:'only-on-failure'},
 projects:[{name:'chromium',use:{browserName:'chromium'}},{name:'webkit',use:{browserName:'webkit'}}],
 webServer:publicURL?undefined:[{cwd:process.cwd(),command:control?'npm run preview -- --host 127.0.0.1 --port 4173':'npx vite preview --outDir qa-provider-v03/dist --host 127.0.0.1 --port 4173',url:'http://127.0.0.1:4173/Weather-watch/',reuseExistingServer:false},{cwd:process.cwd(),command:'node qa-provider-v03/hang-server.mjs',url:'http://127.0.0.1:4174/health',reuseExistingServer:false}]
});
