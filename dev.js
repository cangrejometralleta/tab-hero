// Development server: serves this folder and reloads the page when a file changes.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {watch} from 'node:fs';
import {extname,join,normalize} from 'node:path';

const root=import.meta.dirname,port=Number(process.env.PORT)||5173;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const clients=new Set();
const snippet='<script>new EventSource("/__reload").onmessage=()=>location.reload()</script>';

createServer(async(req,res)=>{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(path==='/__reload'){
    res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-cache'});
    clients.add(res);req.on('close',()=>clients.delete(res));return;
  }
  const file=join(root,normalize(path.endsWith('/')?path+'index.html':path));
  if(!file.startsWith(root)){res.writeHead(403).end();return;}
  try{
    let body=await readFile(file);
    if(extname(file)==='.html')body=body.toString().replace('</body>',snippet+'</body>');
    res.writeHead(200,{'content-type':types[extname(file)]??'application/octet-stream','cache-control':'no-store'}).end(body);
  }catch{res.writeHead(404).end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Tab Hero at http://localhost:${port} (live reload)`));

let pending;
watch(root,{recursive:true},(_,name)=>{
  if(!name||/^(\.|node_modules)/.test(name)||name.endsWith('.test.js'))return;
  clearTimeout(pending);pending=setTimeout(()=>{for(const c of clients)c.write('data: reload\n\n');},80);
});
