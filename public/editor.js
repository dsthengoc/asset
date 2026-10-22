import {floodFill} from './pixel.js';
export class PixelEditor {
 constructor(canvas,overlay,onChange,onPick){this.canvas=canvas;this.overlay=overlay;this.onChange=onChange;this.onPick=onPick;this.past=[];this.future=[];this.mask=new Uint8Array(canvas.width*canvas.height);this.tool='pen';this.color='#c3ec8e';this.enabled=true;let last=null,dirty=false;
 const point=e=>{const r=overlay.getBoundingClientRect();return [Math.max(0,Math.min(canvas.width-1,Math.floor((e.clientX-r.left)*canvas.width/r.width))),Math.max(0,Math.min(canvas.height-1,Math.floor((e.clientY-r.top)*canvas.height/r.height)))];};
 overlay.onpointerdown=e=>{if(!this.enabled)return;e.preventDefault();overlay.setPointerCapture(e.pointerId);this.checkpoint();last=point(e);dirty=this.paint(...last);};
 overlay.onpointermove=e=>{if(!last||!this.enabled)return;const p=point(e),steps=Math.max(Math.abs(p[0]-last[0]),Math.abs(p[1]-last[1]));for(let i=1;i<=steps;i++)dirty=this.paint(Math.round(last[0]+(p[0]-last[0])*i/steps),Math.round(last[1]+(p[1]-last[1])*i/steps))||dirty;last=p;};
 const finish=()=>{if(last&&dirty)this.onChange();last=null;dirty=false;};overlay.onpointerup=finish;overlay.onpointercancel=finish;
 }
 snapshot(){return {width:this.canvas.width,height:this.canvas.height,data:new Uint8ClampedArray(this.ctx().getImageData(0,0,this.canvas.width,this.canvas.height).data),mask:new Uint8Array(this.mask)};}
 ctx(){return this.canvas.getContext('2d',{willReadFrequently:true});}
 checkpoint(){this.past.push(this.snapshot());if(this.past.length>80)this.past.shift();this.future=[];}
 apply(s){this.canvas.width=s.width;this.canvas.height=s.height;this.ctx().putImageData(new ImageData(new Uint8ClampedArray(s.data),s.width,s.height),0,0);this.mask=new Uint8Array(s.mask||s.width*s.height);this.drawMask();}
 resized(){this.mask=new Uint8Array(this.canvas.width*this.canvas.height);this.drawMask();}
 undo(){if(!this.enabled||!this.past.length)return;this.future.push(this.snapshot());this.apply(this.past.pop());this.onChange();}
 redo(){if(!this.enabled||!this.future.length)return;this.past.push(this.snapshot());this.apply(this.future.pop());this.onChange();}
 drawMask(){const c=this.overlay;c.width=this.canvas.width;c.height=this.canvas.height;const d=new Uint8ClampedArray(c.width*c.height*4);this.mask.forEach((v,i)=>{if(v)d.set([255,70,150,140],i*4);});c.getContext('2d').putImageData(new ImageData(d,c.width,c.height),0,0);}
 paint(x,y){const ctx=this.ctx(),i=y*this.canvas.width+x;
 if(this.tool==='mask'||this.tool==='unmask'){this.mask[i]=this.tool==='mask'?1:0;this.drawMask();return true;}
 const rgba=[parseInt(this.color.slice(1,3),16),parseInt(this.color.slice(3,5),16),parseInt(this.color.slice(5,7),16),255];
 if(this.tool==='picker'){const p=ctx.getImageData(x,y,1,1).data;this.onPick('#'+[...p.slice(0,3)].map(v=>v.toString(16).padStart(2,'0')).join(''));return false;}
 if(this.tool==='fill'){const d=ctx.getImageData(0,0,this.canvas.width,this.canvas.height);floodFill(d.data,this.canvas.width,this.canvas.height,x,y,rgba);ctx.putImageData(d,0,0);}
 else if(this.tool==='eraser')ctx.clearRect(x,y,1,1);else{ctx.fillStyle=this.color;ctx.fillRect(x,y,1,1);}return true;
 }
}
