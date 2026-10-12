import {defineConfig,mergeConfig} from 'vite';
import {resolve} from 'node:path';
import production from '../vite.config';
// TEST-ONLY: observe the actual QueryClient without changing its options or app source.
export default mergeConfig(production,defineConfig({build:{outDir:'qa-provider-v03/dist',emptyOutDir:true,rollupOptions:{input:{app:resolve('index.html'),probe:resolve('qa-provider-v03/http-probe.html')}}},plugins:[{
 name:'ww-test-only-query-observer',enforce:'pre',transform(code,id){
  if(!id.endsWith('/src/main.tsx'))return;
  const marker='ReactDOM.createRoot';if(!code.includes(marker))throw new Error('Query observer insertion point missing');
  return code.replace(marker,`(window as any).__WW_QUERY_CLIENT = queryClient;
queryClient.getQueryCache().subscribe(event => {
 const q=event.query;if(!q)return;
 const s=q.state;
 ((window as any).__WW_QUERY_EVENTS ||= []).push({at:performance.now(),type:event.type,action:(event as any).action?.type,key:q.queryKey,status:s.status,fetchStatus:s.fetchStatus,failures:s.fetchFailureCount,error:s.error?.message,updatedAt:s.dataUpdatedAt});
});\n${marker}`).replace('ReactDOM.createRoot(document.getElementById("root")!).render(',`const testRoot = ReactDOM.createRoot(document.getElementById("root")!);
(window as any).__WW_APP_ROOT = testRoot;
testRoot.render(`);
 }
}]}));
