// Native Webpack equivalent of Vite's ?worker&url. MapLibre 6's worker imports
// maplibre-gl-shared.mjs, so emitting the raw entry as an asset is NOT sufficient.
const {build}=require('esbuild');
const {createHash}=require('node:crypto');
module.exports=function(){
  this.cacheable(true);
  const done=this.async();
  build({entryPoints:[this.resourcePath],bundle:true,write:false,metafile:true,
    format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'inline'})
    .then(result=>{
      const outputs=Object.values(result.metafile.outputs);
      if(outputs.length!==1||outputs[0].imports.length)throw new Error('Map worker must be a single self-contained public module.');
      for(const input of Object.keys(result.metafile.inputs))this.addDependency(require('node:path').resolve(input));
      const body=Buffer.from(result.outputFiles[0].contents);
      // Already minified by esbuild: prevent Webpack's later minimizer from
      // changing bytes AFTER hashing. A v2 namespace leaves old cached paths
      // immutable even though their historical post-minify bytes differed.
      // https://webpack.js.org/api/loaders/#thisemitfile
      const filename='static/workers/maplibre-v2-'+createHash('sha256').update(body).digest('hex').slice(0,20)+'.js';
      this.emitFile(filename,body,undefined,{minimized:true});
      const origin=process.env.SAVORA_PUBLIC_ASSET_ORIGIN;
      if(origin){
        if(origin!=='https://assets.cookwsavora.com')throw new Error('Unapproved worker CDN origin');
        // Worker entry must remain same-origin. Its single static ESM import may
        // use CORS. No blob/eval, fetched code rewriting or weakened CSP needed.
        // https://developer.mozilla.org/en-US/docs/Web/API/Worker/Worker#parameters
        const bootstrap=filename.replace(/\.js$/,'-entry.js');
        this.emitFile(bootstrap,Buffer.from('import '+JSON.stringify(origin+'/_next/'+filename)+';\n'));
        done(null,'export default '+JSON.stringify('/_next/'+bootstrap)+';');
        return;
      }
      done(null,'export default __webpack_public_path__ + '+JSON.stringify(filename)+';');
    }).catch(done);
};
