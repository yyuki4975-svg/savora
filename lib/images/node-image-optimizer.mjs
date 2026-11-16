// Node-only Vinext adapter. It receives validated image bytes, never a URL.
// Contract: vinext 1.0.1 dist/image/image-adapters-virtual.d.ts
// https://sharp.pixelplumbing.com/api-resize/#resize
// https://sharp.pixelplumbing.com/api-constructor/
import sharp from 'sharp';
import {createHash} from 'node:crypto';

export const limits=Object.freeze({inputBytes:20*1024**2,pixels:32*1024**2,outputBytes:8*1024**2,
  cacheBytes:32*1024**2,cacheEntries:96,concurrent:2,queued:8,queueMs:5000,readMs:10000});
const widths=new Set([16,32,48,64,96,128,256,384,640,750,828,1080,1200,1920,2048,3840]);
const formats=new Set(['image/avif','image/webp','image/jpeg']);
sharp.cache({memory:16,files:0,items:32});
sharp.concurrency(1);

async function boundedInput(body){
 const reader=body.getReader();let bytes=0;const chunks=[];
 let rejectDeadline;
 const deadline=new Promise((_,reject)=>{rejectDeadline=reject;});
 const timer=setTimeout(()=>{void reader.cancel().catch(()=>{});rejectDeadline(new Error('Image read timeout'));},limits.readMs);
 try{
  while(true){const {done,value}=await Promise.race([reader.read(),deadline]);if(done)break;
   bytes+=value.byteLength;if(bytes>limits.inputBytes)throw new Error('Image input too large');chunks.push(Buffer.from(value));}
  if(!bytes)throw new Error('Empty image');return Buffer.concat(chunks,bytes);
 }catch{void reader.cancel().catch(()=>{});throw new Error('Image input rejected');}
 finally{clearTimeout(timer);reader.releaseLock();}
}

export default function nodeImageOptimizer(){
 const cache=new Map();const waiting=[];let cachedBytes=0,active=0;
 const acquire=()=>{
  if(active<limits.concurrent){active++;return Promise.resolve();}
  if(waiting.length>=limits.queued)return Promise.reject(new Error('Image optimizer busy'));
  return new Promise((resolve,reject)=>{
   const entry={resolve:()=>{clearTimeout(entry.timer);resolve();},timer:null};
   entry.timer=setTimeout(()=>{const i=waiting.indexOf(entry);if(i>=0)waiting.splice(i,1);reject(new Error('Image queue timeout'));},limits.queueMs);
   waiting.push(entry);
  });
 };
 const release=()=>{const next=waiting.shift();if(next)next.resolve();else active--;};
 const response=(data,format)=>new Response(new Uint8Array(data),{headers:{'Content-Type':format}});
 return {async transformImage(body,options){
  const {width,quality,format}=options??{};
  if(!widths.has(width)||!Number.isInteger(quality)||quality<1||quality>100||!formats.has(format))throw new Error('Invalid image options');
  await acquire();
  try{
   const input=await boundedInput(body);
   const key=createHash('sha256').update(input).update(`:${width}:${quality}:${format}`).digest('hex');
   const hit=cache.get(key);
   if(hit){cache.delete(key);cache.set(key,hit);return response(hit,format);}
   const image=sharp(input,{limitInputPixels:limits.pixels,failOn:'warning',animated:false}).timeout({seconds:8});
   const metadata=await image.metadata();
   if(!['jpeg','png','webp','avif','heif','gif','tiff'].includes(metadata.format)||!metadata.width||!metadata.height||
    metadata.width*metadata.height>limits.pixels||(metadata.pages??1)>1)throw new Error('Unsupported raster image');
   image.rotate().resize({width,withoutEnlargement:true});
   if(format==='image/avif')image.avif({quality,effort:0});
   else if(format==='image/webp')image.webp({quality,effort:3});
   else image.flatten({background:'#ffffff'}).jpeg({quality,mozjpeg:false});
   const data=await image.toBuffer();
   if(data.length>limits.outputBytes)throw new Error('Image output too large');
   while(cache.size>=limits.cacheEntries||cachedBytes+data.length>limits.cacheBytes){
    const oldest=cache.keys().next().value;if(oldest===undefined)break;
    cachedBytes-=cache.get(oldest).length;cache.delete(oldest);
   }
   cache.set(key,data);cachedBytes+=data.length;return response(data,format);
  }finally{release();}
 }};
}
