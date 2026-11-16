// Vinext 1.0.1 prod-server intercepts images before its configured optimizer.
// Use its exported handler on the SAME Node server, leaving every other request
// untouched. No extra proxy hop, port, URL fetch, trust setting or vendor patch.
import assert from 'node:assert/strict';
import {realpath,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {Readable} from 'node:stream';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {startProdServer,sendWebResponse} from 'vinext/server/prod-server';
import {handleImageOptimization,isImageOptimizationPath} from 'vinext/server/image-optimization';
import optimizer,{limits} from './node-image-optimizer.mjs';
const contentTypes={'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp',
 '.avif':'image/avif','.gif':'image/gif','.tif':'image/tiff','.tiff':'image/tiff','.bmp':'image/bmp','.ico':'image/x-icon'};

export function installImageHandler(server,publicRoot){
 const previous=server.listeners('request');assert.equal(previous.length,1);
 const transform=optimizer();
 const rootPromise=realpath(publicRoot);
 async function fetchAsset(raw){
  try{
   const root=await rootPromise;
   const decoded=decodeURIComponent(raw);
   if(!decoded.startsWith('/images/')||decoded.includes('\\')||decoded.includes('\0')||decoded.includes('?')||decoded.includes('#'))return new Response(null,{status:404});
   const location=await realpath(path.resolve(root,'.'+decoded));
   if(!location.startsWith(root+path.sep))return new Response(null,{status:404});
   const info=await stat(location),type=contentTypes[path.extname(location).toLowerCase()];
   if(!info.isFile()||!type||!info.size||info.size>limits.inputBytes)return new Response(null,{status:404});
   return new Response(Readable.toWeb(createReadStream(location)),{headers:{'Content-Type':type,'Content-Length':String(info.size)}});
  }catch{return new Response(null,{status:404});}
 }
 server.removeAllListeners('request');
 server.on('request',function(req,res){
  let url;try{url=new URL(req.url??'/','http://localhost');}catch{return previous[0].call(server,req,res);}
  if(!isImageOptimizationPath(url.pathname))return previous[0].call(server,req,res);
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy',"script-src 'none'; frame-src 'none'; sandbox;");
  void(async()=>{
   if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{Allow:'GET, HEAD','Cache-Control':'no-store'});res.end();return;}
   if((req.url?.length??0)>4096){res.writeHead(414,{'Cache-Control':'no-store'});res.end();return;}
   const request=new Request(url,{headers:{Accept:String(req.headers.accept??'image/jpeg')}});
   let response=await handleImageOptimization(request,{fetchAsset,transformImage:transform.transformImage});
   if(req.method==='HEAD'){
    await response.body?.cancel();response=new Response(null,{status:response.status,headers:response.headers});
   }
   if(response.status>=400)response.headers.set('Cache-Control','no-store');
   await sendWebResponse(response,req,res,false);
  })().catch(()=>{
   if(!res.headersSent){res.writeHead(503,{'Cache-Control':'no-store'});res.end('Image temporarily unavailable');}
   else res.destroy();
  });
 });
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 const root=path.resolve(import.meta.dirname,'../..');
 try{
  const {server}=await startProdServer({port:Number(process.env.PORT??3000),host:process.env.HOST??'0.0.0.0',outDir:path.join(root,'dist')});
  installImageHandler(server,path.join(root,'public'));
 }catch{console.error('Savora Node image runtime refused startup');process.exitCode=1;}
}
