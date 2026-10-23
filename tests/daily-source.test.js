'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadDay}=require('../api/_lib/daily');
test('collector queries official date window, drops records from other days',async()=>{
 const calls=[];
 const today='2026-10-23';
 const api=async url=>{
  const u=new URL(url);calls.push(u);
  if(u.pathname.endsWith('/proposicoes'))return {dados:[
   {id:123,siglaTipo:'PL',numero:1,ano:2026,dataApresentacao:today+'T14:00',ementa:'Hoje'},
   {id:124,siglaTipo:'PL',numero:2,ano:2026,dataApresentacao:'2026-10-22T13:00',ementa:'Ontem'}
  ]};
  if(u.pathname.endsWith('/votacoes'))return {dados:[{id:'11-4',data:today,descricao:'Votação de hoje'},{id:'11-3',data:'2026-10-22'}]};
  if(u.pathname.endsWith('/eventos'))return {dados:[{id:22,dataHoraInicio:today+'T17:00',descricao:'Sessão hoje'},{id:23,dataHoraInicio:'2026-10-24T17:00'}]};
  if(u.pathname.endsWith('/materia/atualizadas.json'))return {ListaMateriasAtualizadas:{Materia:[]}};
  throw Error('Unexpected URL: '+u);
 };
 const result=await loadDay({instant:new Date('2026-10-23T16:00:00Z'),get:api});
 assert.equal(result.dia,today);
 assert.equal(result.materias.length,1);
 assert.equal(result.votacoes.length,1);
 assert.equal(result.eventos.length,1);
 assert.equal(result.falhas.length,0);
 for(const u of calls.filter(x=>x.pathname.endsWith('/proposicoes')||x.pathname.endsWith('/votacoes')||x.pathname.endsWith('/eventos'))){
  assert.equal(u.searchParams.get('dataInicio'),today);
  assert.equal(u.searchParams.get('dataFim'),today);
 }
});
test('zero genuine records is a valid response, not evidence of unavailable sources',async()=>{
 const api=async url=>url.includes('/materia/atualizadas')?{}:{dados:[]};
 const result=await loadDay({instant:new Date('2026-10-23T12:00:00Z'),get:api});
 assert.equal(result.materias.length,0);
 assert.equal(result.votacoes.length,0);
 assert.equal(result.eventos.length,0);
 assert.equal(result.falhas.length,0);
});
