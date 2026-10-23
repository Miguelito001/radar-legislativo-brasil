'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const matters=require('../api/materias');
const detail=require('../api/materia');
function response(){let data='',statusCode=200;return {headers:{},setHeader(k,v){this.headers[k]=v},end(x){data=x},get result(){return {status:this.statusCode,payload:JSON.parse(data)}}};}
function fake(payload,status=200){return {ok:status===200,status,json:async()=>payload}}
test('busca da Câmara preserva ementa e link oficial',async t=>{
 const old=global.fetch; t.after(()=>{global.fetch=old});
 global.fetch=async url=>{assert.match(url.toString(),/dadosabertos\.camara\.leg\.br/);return fake({dados:[{id:912345,siglaTipo:'PEC',numero:44,ano:2026,ementa:'Ementa conforme a fonte'}]})};
 const res=response();await matters({method:'GET',url:'/api/materias?fonte=camara&tipo=PEC'},res);const out=res.result;
 assert.equal(out.status,200);assert.equal(out.payload.materias.length,1);assert.equal(out.payload.materias[0].ementa,'Ementa conforme a fonte');assert.equal(out.payload.falhas.length,0);assert.match(out.payload.materias[0].url,/www\.camara\.leg\.br/);
});
test('detalhe contém registros distintos de tramitação e votação',async t=>{
 const old=global.fetch;t.after(()=>{global.fetch=old});
 global.fetch=async url=>{const u=String(url);if(u.includes('/tramitacoes'))return fake({dados:[{dataHora:'2026-10-20T12:00:00',descricaoTramitacao:'Despacho da Mesa'}]});if(u.includes('/votacoes'))return fake({dados:[{id:'333-44',data:'2026-10-21',descricao:'Votação do requerimento',descricaoResultado:'Aprovado'}]});return fake({dados:{id:98989,siglaTipo:'PL',numero:30,ano:2026,ementa:'Registro oficial',statusProposicao:{descricaoSituacao:'Aguardando parecer'}}})};
 const res=response();await detail({method:'GET',url:'/api/materia?origem=camara&id=98989'},res);
 assert.equal(res.result.status,200);assert.equal(res.result.payload.tramitacoes.length,1);assert.equal(res.result.payload.votacoes.length,1);assert.equal(res.result.payload.detalhes.situacao,'Aguardando parecer');
});
test('entrada inválida não consulta as fontes',async()=>{const r=response();await matters({method:'GET',url:'/api/materias?tipo=../etc'},r);assert.equal(r.result.status,400)});
