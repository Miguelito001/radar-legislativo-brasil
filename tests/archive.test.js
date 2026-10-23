'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {changes}=require('../scripts/archive');
const source={key:'camara:1',id:'1',origem:'camara',casa:'Câmara',tipo:'PL',numero:'100',ano:'2026',ementa:'Texto original',data:'2026-10-23',situacao:'Em tramitação',url:'https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=1'};
test('arquivo registra primeira observação uma vez',()=>{
 const e=changes(null,{materias:[source]},'2026-10-23T15:00:00Z');
 assert.equal(e.length,1);assert.equal(e[0].type,'observed_first_in_sample');
 assert.equal(e[0].observed_at,'2026-10-23T15:00:00Z');
});
test('repetições idênticas não criam registros artificiais',()=>{
 const e=changes({materias:[source]},{materias:[{...source}]},'2026-10-23T15:00:00Z');
 assert.equal(e.length,0);
});
test('modificação detectada é observação e nunca votação inferida',()=>{
 const newer={...source,ementa:'Texto alterado'};
 const e=changes({materias:[source]},{materias:[newer]},'2026-10-23T15:00:00Z');
 assert.equal(e.length,1);
 assert.equal(e[0].type,'observed_change');
 assert.equal(e[0].state.ementa,'Texto alterado');
 assert.ok(!('approval' in e[0]));
});
test('Ano 0 recebido na fonte é preservado como não especificado, sem inferência',()=>{const item={...source,ano:'0'};assert.equal(changes(null,{materias:[item]},'2026-10-23T15:00:00Z').length,1);});
test('matéria ausente do novo lote não é considerada arquivada',()=>{
 const e=changes({materias:[source]},{materias:[]},'2026-10-23T15:00:00Z');
 assert.equal(e.length,0);
});
test('enriquecimento de autoria não altera hash legislativo',()=>{
 const newer={...source,autores:[{nome:'Autor Teste'}]};
 const e=changes({materias:[source]},{materias:[newer]},'2026-10-23T15:00:00Z');
 assert.equal(e.length,0);
});
