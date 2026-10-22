// Median-cut palette, hard alpha, and nearest palette mapping. No dithering.
export function quantize(data, maxColors=32, alpha=128) {
  if(!Number.isInteger(maxColors)||maxColors<2||maxColors>256)throw new Error('Invalid palette size');
  const histogram=new Map();
  for(let i=0;i<data.length;i+=4){if(data[i+3]<alpha||data[i+3]===0)continue;const key=(data[i]<<16)|(data[i+1]<<8)|data[i+2];histogram.set(key,(histogram.get(key)||0)+1);}
  let boxes=[Array.from(histogram,([k,n])=>({c:[k>>16,(k>>8)&255,k&255],n}))];
  const range=b=>[0,1,2].map(ch=>Math.max(...b.map(p=>p.c[ch]))-Math.min(...b.map(p=>p.c[ch])));
  while(boxes.length<maxColors){
    let index=-1,score=-1,channel=0;
    boxes.forEach((b,i)=>{if(b.length<2)return;const r=range(b),s=Math.max(...r);if(s>score){index=i;score=s;channel=r.indexOf(s);}});
    if(index<0)break;
    const b=boxes.splice(index,1)[0].sort((a,b)=>a.c[channel]-b.c[channel]);
    const half=b.reduce((s,p)=>s+p.n,0)/2;let sum=0,cut=1;
    for(let i=0;i<b.length-1;i++){sum+=b[i].n;cut=i+1;if(sum>=half)break;}
    boxes.push(b.slice(0,cut),b.slice(cut));
  }
  const palette=boxes.filter(b=>b.length).map(b=>{const n=b.reduce((s,p)=>s+p.n,0);return [0,1,2].map(c=>Math.round(b.reduce((s,p)=>s+p.c[c]*p.n,0)/n));});
  const out=new Uint8ClampedArray(data.length);
  for(let i=0;i<data.length;i+=4){
    if(data[i+3]<alpha||data[i+3]===0)continue;
    let best=palette[0],dist=Infinity;
    for(const p of palette){const d=p.reduce((s,v,c)=>s+(v-data[i+c])**2,0);if(d<dist){best=p;dist=d;}}
    out.set([...best,255],i);
  }
  return {data:out,palette};
}
export function workflow({checkpoint,lora,prompt,negative,seed,steps=24}) {
  const w={
    '1':{class_type:'CheckpointLoaderSimple',inputs:{ckpt_name:checkpoint}},
    '2':{class_type:'CLIPTextEncode',inputs:{text:prompt,clip:['1',1]}},
    '3':{class_type:'CLIPTextEncode',inputs:{text:negative,clip:['1',1]}},
    '4':{class_type:'EmptyLatentImage',inputs:{width:512,height:512,batch_size:1}},
    '5':{class_type:'KSampler',inputs:{model:['1',0],positive:['2',0],negative:['3',0],latent_image:['4',0],seed,steps,cfg:7,sampler_name:'euler',scheduler:'normal',denoise:1}},
    '6':{class_type:'VAEDecode',inputs:{samples:['5',0],vae:['1',2]}},
    '7':{class_type:'SaveImage',inputs:{images:['6',0],filename_prefix:'pixel-loop'}}
  };
  if(lora){w['8']={class_type:'LoraLoader',inputs:{model:['1',0],clip:['1',1],lora_name:lora,strength_model:0.8,strength_clip:0.8}};w['2'].inputs.clip=['8',1];w['3'].inputs.clip=['8',1];w['5'].inputs.model=['8',0];}
  return w;
}

export function inpaintWorkflow(params, imageName, maskName) {
  const w=workflow(params);
  w['9']={class_type:'LoadImage',inputs:{image:imageName}};
  w['10']={class_type:'LoadImageMask',inputs:{image:maskName,channel:'red'}};
  w['11']={class_type:'VAEEncodeForInpaint',inputs:{pixels:['9',0],vae:['1',2],mask:['10',0],grow_mask_by:0}};
  w['5'].inputs.latent_image=['11',0];
  w['5'].inputs.denoise=0.85;
  delete w['4'];
  return w;
}
export function floodFill(data,width,height,x,y,color) {
  const start=(y*width+x)*4, old=[...data.slice(start,start+4)];
  if(old.every((v,c)=>v===color[c]))return;
  const todo=[y*width+x];
  while(todo.length){const i=todo.pop(),p=i*4;if(!old.every((v,c)=>data[p+c]===v))continue;data.set(color,p);const px=i%width,py=Math.floor(i/width);if(px>0)todo.push(i-1);if(px<width-1)todo.push(i+1);if(py>0)todo.push(i-width);if(py<height-1)todo.push(i+width);}
}
export function mergeMasked(original,replacement,mask){
  if(original.length!==replacement.length||mask.length*4!==original.length)throw new Error('Mask dimensions mismatch');
  const result=new Uint8ClampedArray(original);
  for(let i=0;i<mask.length;i++)if(mask[i])result.set(replacement.slice(i*4,i*4+4),i*4);
  return result;
}
