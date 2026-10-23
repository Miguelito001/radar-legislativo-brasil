'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {isAuthorized}=require('../api/cron-db');
test('cron: não executa sem segredo e valida cabeçalho exato',()=>{
 assert.equal(isAuthorized(undefined,undefined),false);
 assert.equal(isAuthorized('Bearer x',undefined),false);
 assert.equal(isAuthorized('Bearer certo','certo'),true);
 assert.equal(isAuthorized('Bearer errado','certo'),false);
 assert.equal(isAuthorized('Basic certo','certo'),false);
});
test('cron: endpoint público bloqueado sem credencial',async()=>{
 const f=require('../api/cron-db');
 const response={statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v},end(x){this.body=JSON.parse(x)}};
 await f({method:'GET',headers:{}},response);
 assert.equal(response.statusCode,401);
 assert.equal(response.headers['Cache-Control'],'no-store');
});
