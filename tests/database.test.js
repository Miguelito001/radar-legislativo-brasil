'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {normalizeBatch,openPool,migrate,saveMatters,saveMovements}=require('../database/client');
const {fingerprint}=require('../packages/core/observations');
const {searchMatters,matterDetails,getPool}=require('../database/query');
function dummy(id,ementa='Teste de ementa'){
 return {key:'camara:'+id,origem:'camara',id:String(id),tipo:'PL',numero:'1',ano:'2026',
 ementa,data:'2026-10-23',situacao:'Em tramitação',
 url:'https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao='+id};
}
test('identidade não depende da ordem dos campos e não cria eventos de autoria',()=>{
 assert.equal(fingerprint({z:1,a:{d:2,c:3}}),fingerprint({a:{c:3,d:2},z:1}));
 const x=normalizeBatch([dummy('999100100'),{...dummy('999100100'),autores:[{nome:'Autor teste'}]}]);
 assert.equal(x.length,1);
 assert.equal(x[0].source,'camara');
 assert.match(x[0].current_hash,/^[a-f0-9]{64}$/);
});
test('PostgreSQL migrates, archives real state transitions and preserves reversion',async(t)=>{
 if(!process.env.DATABASE_URL){t.skip('requires disposable PostgreSQL');return;}
 const pool=openPool();
 const id=String(Date.now());
 const matter=dummy(id);
 const client=await pool.connect();
 try{
  await migrate(client);
  let result=await saveMatters(client,[matter]);
  assert.equal(result.processed,1);assert.equal(result.revisions,1);
  result=await saveMatters(client,[matter]);
  assert.equal(result.revisions,0);
  result=await saveMatters(client,[{...matter,ementa:'Mudança de texto'}]);
  assert.equal(result.revisions,1);
  result=await saveMatters(client,[matter]);
  assert.equal(result.revisions,1);
  const search=await searchMatters({fonte:'camara',numero:'1',ano:'2026',q:'Teste de ementa'});
  assert.ok(search.total>=1);
  assert.ok(search.materias.some(m=>m.id===id));
  const detailed=await matterDetails('camara',id);
  assert.equal(detailed.materia.id,id);
  const injection=await searchMatters({fonte:'camara',q:"' OR 1=1 --"});
  assert.equal(injection.total,0);
  const observations=await client.query(
   'select fingerprint from rl_observations where source=$1 and external_id=$2 order by id',
   ['camara',id]
  );
  assert.equal(observations.rows.length,3);
  assert.equal(observations.rows[0].fingerprint,observations.rows[2].fingerprint);
  const moves=[{id:12345,data:'2026-10-23',descricaoTramitacao:'Distribuído à comissão',siglaOrgao:'CCJC'}];
  assert.equal(await saveMovements(client,'camara',id,moves),1);
  assert.equal(await saveMovements(client,'camara',id,moves),0);
  const found=await client.query(
   'select official_description from rl_movements where source=$1 and external_id=$2',
   ['camara',id]
  );
  assert.deepEqual(found.rows.map(x=>x.official_description),['Distribuído à comissão']);
 }finally{
  await client.query('delete from rl_observations where source=$1 and external_id=$2',['camara',id]);
  await client.query('delete from rl_movements where source=$1 and external_id=$2',['camara',id]);
  await client.query('delete from rl_matters where source=$1 and external_id=$2',['camara',id]);
  client.release();await pool.end();await getPool()?.end();
 }
});
