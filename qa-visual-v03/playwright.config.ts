import {defineConfig} from '@playwright/test';
const deployed=process.env.WW_E2E_BASE_URL;
export default defineConfig({testDir:'.',testMatch:'*.spec.ts',workers:1,retries:0,timeout:90000,reporter:[['list'],['html',{outputFolder:'browser-report',open:'never'}]],outputDir:'test-results',use:{baseURL:deployed||'http://127.0.0.1:4173/Weather-watch/',viewport:{width:390,height:844},hasTouch:true,trace:'retain-on-failure'},webServer:deployed?undefined:{command:'npm run preview -- --host 127.0.0.1 --port 4173',url:'http://127.0.0.1:4173/Weather-watch/',reuseExistingServer:!process.env.CI}});
