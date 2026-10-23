'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createServer}=require('../server');
test('servidor independente entrega interface e snapshots sem expor arquivos internos',async()=>{
 const server=createServer();
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const host='http://127.0.0.1:'+server.address().port;
 try{
  for(const route of ['/','/app.js','/glossary.js','/day.js']){
   const r=await fetch(host+route);
   assert.equal(r.status,200,route);
   assert.ok((await r.text()).length>100,route);
  }
  for(const route of ['/database/client.js','/package.json','/scripts/ingest.js','/.env','/data/latest.json']){
   assert.equal((await fetch(host+route)).status,404,route);
  }
  const status=await fetch(host+'/api/saude');
  assert.equal(status.status,200);
  const data=await status.json();
  assert.equal(data.state,'daily_only');
 }finally{await new Promise(resolve=>server.close(resolve));}
});
