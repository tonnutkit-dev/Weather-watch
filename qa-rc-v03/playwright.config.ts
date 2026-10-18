import {defineConfig} from '@playwright/test';
const root=process.env.WW_RC_ROOT==='1';
export default defineConfig({testDir:'.',testMatch:'acceptance.spec.ts',workers:1,retries:0,timeout:120000,expect:{timeout:10000},reporter:[['list'],['json',{outputFile:'test-results/summary.json'}],['html',{outputFolder:'browser-report',open:'never'}]],outputDir:'test-results',
 use:{baseURL:root?'http://127.0.0.1:4173/':'http://127.0.0.1:4173/Weather-watch/',viewport:{width:390,height:844},hasTouch:true,trace:'retain-on-failure',screenshot:'only-on-failure'},projects:[{name:'chromium',use:{browserName:'chromium'}},{name:'webkit',use:{browserName:'webkit'}}],
 webServer:{cwd:process.cwd(),stdout:'pipe',command:root?'npx vite preview --base=/ --outDir dist-owner-rc --host 127.0.0.1 --port 4173':'npm run preview -- --host 127.0.0.1 --port 4173',url:root?'http://127.0.0.1:4173/':'http://127.0.0.1:4173/Weather-watch/',reuseExistingServer:false}});
