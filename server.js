import http from 'node:http';
import { readFile } from 'node:fs/promises';
const base = new URL(process.env.COMFY_URL || 'http://127.0.0.1:8188');
const port = Number(process.env.PORT || 3000);
const files = {'/':'index.html','/app.js':'app.js','/pixel.js':'pixel.js','/editor.js':'editor.js','/style.css':'style.css'};
const server = http.createServer(async (req,res) => {
  try {
    if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) { res.writeHead(403).end(); return; }
    const u = new URL(req.url, 'http://localhost');
    if (u.pathname.startsWith('/api/')) {
      const path = u.pathname.slice(4);
      if (!['/object_info','/prompt','/view','/upload/image','/queue'].includes(path) && !/^\/history\/[a-zA-Z0-9-]+$/.test(path)) {res.writeHead(404).end();return;}
      if (!['GET','POST'].includes(req.method) || (req.method === 'POST' && !['/prompt','/upload/image','/queue'].includes(path))) {res.writeHead(405).end();return;}
      let body;
      if (req.method === 'POST') {
        let size=0; const chunks=[];
        for await (const chunk of req) {size+=chunk.length;if(size>(path==='/upload/image'?12000000:65536)){res.writeHead(413).end();return;}chunks.push(chunk);}
        body=Buffer.concat(chunks);
        if(path!=='/upload/image'){try{JSON.parse(body.toString());}catch{res.writeHead(400).end();return;}}
      }
      const response=await fetch(new URL(path+u.search,base),{method:req.method,body,headers:body?{'Content-Type':path==='/upload/image'?req.headers['content-type']||'application/octet-stream':'application/json'}:{},signal:AbortSignal.timeout(30000)});
      res.writeHead(response.status,{'Content-Type':response.headers.get('content-type')||'application/json','Cache-Control':'no-store'});
      res.end(Buffer.from(await response.arrayBuffer()));return;
    }
    const file=files[u.pathname];
    if(!file || req.method!=='GET'){res.writeHead(404).end();return;}
    res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html','X-Content-Type-Options':'nosniff'});
    res.end(await readFile(new URL('./public/'+file,import.meta.url)));
  } catch {res.writeHead(502,{'Content-Type':'application/json'}).end(JSON.stringify({error:'Không kết nối được ComfyUI hoặc phản hồi không hợp lệ. Kiểm tra ComfyUI và COMFY_URL.'}));}
}).listen(port,'127.0.0.1',()=>console.log(`Pixel Loop listening on port ${server.address().port}`));
