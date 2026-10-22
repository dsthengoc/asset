import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {workflow} from '../public/pixel.js';
test('local app serves UI and forwards generation/history/image to configured ComfyUI',async t=>{
 let submitted, uploaded;
 const image=Buffer.from('89504e470d0a1a0a','hex');
 const mock=http.createServer(async(req,res)=>{
  res.setHeader('Content-Type','application/json');
  if(req.url==='/object_info')return res.end(JSON.stringify({CheckpointLoaderSimple:{input:{required:{ckpt_name:[['test.safetensors']]}}}}));
  if(req.url==='/upload/image'){const chunks=[];for await(const chunk of req)chunks.push(chunk);uploaded={type:req.headers['content-type'],body:Buffer.concat(chunks).toString()};return res.end(JSON.stringify({name:'source.png'}));}
  if(req.url==='/prompt'){let body='';for await(const chunk of req)body+=chunk;submitted=JSON.parse(body);return res.end(JSON.stringify({prompt_id:'test-42'}));}
  if(req.url==='/history/test-42')return res.end(JSON.stringify({'test-42':{outputs:{'7':{images:[{filename:'sprite.png',type:'output',subfolder:''}]}}}}));
  if(req.url.startsWith('/view?')){res.setHeader('Content-Type','image/png');return res.end(image);}
  res.writeHead(404).end();
 });
 mock.listen(0,'127.0.0.1');await once(mock,'listening');t.after(()=>mock.close());
 const child=spawn(process.execPath,['server.js'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:'0',COMFY_URL:`http://127.0.0.1:${mock.address().port}`},stdio:['ignore','pipe','pipe']});
 t.after(()=>child.kill());
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Startup timeout')),5000);child.stdout.on('data',b=>{const m=b.toString().match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});child.on('error',reject);});
 const base=`http://127.0.0.1:${port}`;
 const ui=await fetch(base);assert.equal(ui.status,200);assert.match(await ui.text(),/Pixel Loop/);
 const info=await (await fetch(base+'/api/object_info')).json();assert.equal(info.CheckpointLoaderSimple.input.required.ckpt_name[0][0],'test.safetensors');
 const prompt=workflow({checkpoint:'test.safetensors',prompt:'knight',negative:'blur',seed:42});
 const job=await(await fetch(base+'/api/prompt',{method:'POST',body:JSON.stringify({prompt})})).json();assert.equal(job.prompt_id,'test-42');assert.deepEqual(submitted.prompt,prompt);
 const history=await(await fetch(base+'/api/history/test-42')).json();assert.equal(history['test-42'].outputs['7'].images[0].filename,'sprite.png');
 const png=await fetch(base+'/api/view?filename=sprite.png&type=output');assert.equal(png.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await png.arrayBuffer()),image);
 const form=new FormData();form.append('image',new Blob(['fixture'],{type:'image/png'}),'source.png');assert.equal((await(await fetch(base+'/api/upload/image',{method:'POST',body:form})).json()).name,'source.png');assert.match(uploaded.type,/multipart\/form-data; boundary=/);assert.match(uploaded.body,/fixture/);
 assert.equal((await fetch(base+'/api/prompt',{method:'POST',body:'invalid json'})).status,400);
 assert.equal((await fetch(base+'/api/not-allowed')).status,404);
 assert.equal((await fetch(base+'/api/prompt',{method:'POST',headers:{Origin:'http://untrusted.example'},body:'{}'})).status,403);
});
