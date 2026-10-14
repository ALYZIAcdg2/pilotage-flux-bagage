// Render production server: serves the existing interface and proxies API to Cloudflare PROD.
// All data remains in Cloudflare D1 PROD; Render has no separate database.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';

const root = resolve(process.cwd(), 'public');
const upstream = 'https://pilotage-flux-bagage.alyzia-cdg2.workers.dev';
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ico':'image/x-icon','.webp':'image/webp','.woff2':'font/woff2'};
const port = Number(process.env.PORT || 10000);

http.createServer(async (req,res)=>{
 try {
  const url = new URL(req.url || '/', 'http://localhost');
  if(url.pathname.startsWith('/api/')){
   if(!((req.method==='GET'&&['/api/health','/api/data'].includes(url.pathname))||(req.method==='PUT'&&url.pathname==='/api/days'))){
    res.writeHead(405,{'content-type':'application/json'});res.end(JSON.stringify({error:'Route non autorisée'}));return;
   }
   const body=[];
   for await (const chunk of req){body.push(chunk);if(body.reduce((n,b)=>n+b.length,0)>8_000_000){res.writeHead(413);res.end();return;}}
   const response=await fetch(upstream+url.pathname,{method:req.method,headers:{'content-type':'application/json'},body:req.method==='PUT'?Buffer.concat(body):undefined,signal:AbortSignal.timeout(25000)});
   res.writeHead(response.status,{'content-type':response.headers.get('content-type')||'application/json','cache-control':'no-store'});
   res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  let pathname=decodeURIComponent(url.pathname);
  if(pathname==='/'||pathname==='/flux-bags')pathname='/flux-bags.html';
  const file=resolve(root,'.'+pathname);
  if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  const info=await stat(file);
  if(!info.isFile())throw new Error('Not a file');
  const content=await readFile(file);
  res.writeHead(200,{'content-type':mime[extname(file).toLowerCase()]||'application/octet-stream','cache-control':'no-cache','x-content-type-options':'nosniff'});
  res.end(req.method==='HEAD'?undefined:content);
 }catch(e){res.writeHead(e.code==='ENOENT'?404:502,{'content-type':'text/plain; charset=utf-8'});res.end(e.code==='ENOENT'?'Page introuvable':'Erreur serveur de test');}
}).listen(port,'0.0.0.0',()=>console.log('Render PROD listening on',port));
