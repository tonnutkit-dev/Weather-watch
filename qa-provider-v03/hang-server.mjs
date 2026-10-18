import http from 'node:http';
const events=[];
http.createServer((req,res)=>{
 res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Timing-Allow-Origin','*');
 if(req.url==='/health'){res.end('LAB diagnostic transport');return;}
 if(req.url==='/events'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(events));return;}
 const id=events.length;events.push({id,event:'request',at:Date.now(),url:req.url});
 const timer=setTimeout(()=>{if(!res.destroyed)res.end('LAB delayed response');},40000);
 res.on('close',()=>{clearTimeout(timer);events.push({id,event:'close',at:Date.now()});});
}).listen(4174,'127.0.0.1');
