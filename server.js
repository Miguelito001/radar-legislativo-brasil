'use strict';
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const root=__dirname;
const allowedApis=new Set(['materias','materia','votacoes','agenda','autores','saude','cron-db']);
const staticFiles=new Map([
 ['/','index.html'],['/index.html','index.html'],['/app.js','app.js'],
 ['/glossary.js','glossary.js'],['/styles.css','styles.css'],
 ['/data/latest.json','data/latest.json'],
 ['/data/votacoes.json','data/votacoes.json'],
 ['/data/agenda.json','data/agenda.json']
]);
function contentType(name){
 if(name.endsWith('.json'))return 'application/json; charset=utf-8';
 if(name.endsWith('.ndjson'))return 'application/x-ndjson; charset=utf-8';
 if(name.endsWith('.js'))return 'application/javascript; charset=utf-8';
 if(name.endsWith('.css'))return 'text/css; charset=utf-8';
 return 'text/html; charset=utf-8';
}
function createServer(){
 return http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  try{
   const pathname=new URL(req.url||'/','http://localhost').pathname;
   const api=/^\/api\/([a-z-]+)$/.exec(pathname);
   if(api){
    if(!allowedApis.has(api[1])){res.writeHead(404);res.end('Not found');return;}
    await require('./api/'+api[1]+'.js')(req,res);
    return;
   }
   if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end('Method not allowed');return;}
   let filename=staticFiles.get(pathname);
   if(!filename && /^\/data\/archive\/\d{4}\/\d{2}\/\d{2}\.ndjson$/.test(pathname))
     filename=pathname.slice(1);
   if(!filename){res.writeHead(404);res.end('Not found');return;}
   // Explicit allowlist above prevents disclosure of credentials, source code and backup files.
   const bytes=await fs.readFile(path.join(root,filename));
   res.setHeader('Content-Type',contentType(filename));
   res.setHeader('Cache-Control',filename.includes('data/')?'public,max-age=120':'public,max-age=300');
   res.statusCode=200;
   if(req.method==='HEAD'){res.end();return;}
   res.end(bytes);
  }catch(e){
   console.error('Erro no servidor portátil:',e.message);
   if(!res.headersSent){res.statusCode=e.code==='ENOENT'?404:500;res.setHeader('Content-Type','text/plain; charset=utf-8');}
   res.end('Recurso temporariamente indisponível');
  }
 });
}
if(require.main===module){
 const port=Math.max(1,Math.min(65535,Number(process.env.PORT||3000)));
 createServer().listen(port,'0.0.0.0',()=>console.log('Radar Legislativo em http://0.0.0.0:'+port));
}
module.exports={createServer};
