'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const glossary=require('../glossary');
const day=require('../day');

function createHarness({snapshot,live}){
 const elements=new Map();
 const fake=()=>({innerHTML:'',textContent:'',value:'',disabled:false,hidden:false,dataset:{},
  style:{},classList:{add(){},remove(){},toggle(){},contains(){return false}},
  addEventListener(){},append(){},setAttribute(){},removeAttribute(){},
  getBoundingClientRect(){return {left:0,right:0,top:0,bottom:0}},contains(){return false}});
 const document={
  querySelector(selector){if(!elements.has(selector))elements.set(selector,fake());return elements.get(selector)},
  querySelectorAll(){return []},addEventListener(){},createElement(){return fake()}
 };
 const window={addEventListener(){},scrollTo(){},innerWidth:1100,innerHeight:900};
 const requestLog=[];
 const fetch=async url=>{
  requestLog.push(String(url));
  if(String(url).startsWith('/data/today.json')){
   if(!snapshot)return {ok:false,status:404,json:async()=>({error:'not found'})};
   return {ok:true,json:async()=>snapshot};
  }
  if(String(url).startsWith('/api/hoje')){
   if(!live)return {ok:false,status:502,json:async()=>({error:'offline'})};
   return {ok:true,json:async()=>live};
  }
  return {ok:false,status:404,json:async()=>({error:'not found'})};
 };
 const context={document,window,console,URL,URLSearchParams,Intl,Date,Map,Set,Promise,AbortController,AbortSignal,
  setTimeout,clearTimeout,setInterval:()=>1,globalThis:null,fetch};
 context.globalThis=context;context.RadarGlossary=glossary;context.RadarDay=day;
 const source=fs.readFileSync(path.resolve(__dirname,'../app.js'),'utf8');
 vm.runInNewContext(source,context,{filename:'app.js'});
 return {elements,requestLog};
}
function payload(dateKey){
 const matter={key:'camara:123',id:'123',origem:'camara',casa:'Câmara',tipo:'PL',
 numero:'14',ano:'2026',ementa:'Matéria do dia',data:dateKey+'T10:00',
 url:'https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=123'};
 return {dia:dateKey,consultadoEm:new Date().toISOString(),fontesConsultadas:['camara-proposicoes','camara-votacoes','camara-eventos'],falhas:[],
  materias:[matter,{...matter,key:'camara:321',id:'321',ementa:'Matéria velha',data:'2020-04-03'}],
  votacoes:[{id:'1',data:dateKey,descricao:'Votação do dia',url:'https://dadosabertos.camara.leg.br/api/v2/votacoes/1'}],
  eventos:[{id:4,data:dateKey+'T14:00',descricao:'Sessão de hoje',situacao:'Convocada',url:'https://dadosabertos.camara.leg.br/api/v2/eventos/4'}]};
}
const pause=()=>new Promise(resolve=>setTimeout(resolve,60));
test('dashboard rejects yesterday and shows only verified today',async()=>{
 const today=day.todayKey();
 const sample=payload(today);
 const old={...payload('2020-04-03'),materias:[{...sample.materias[0],data:'2020-04-03'}]};
 const ui=createHarness({snapshot:old,live:sample});
 await pause();
 const html=ui.elements.get('#radar-results').innerHTML;
 assert.match(html,/Matéria do dia/);
 assert.match(html,/Votação do dia/);
 assert.match(html,/Sessão de hoje/);
 assert.doesNotMatch(html,/Matéria velha/);
 assert.equal(ui.elements.get('#count-matters').textContent,'1');
 assert.equal(ui.elements.get('#count-camara').textContent,'1');
 assert.equal(ui.elements.get('#count-senado').textContent,'1');
});
test('dashboard does not show stale snapshot if upstream is unavailable',async()=>{
 const ui=createHarness({snapshot:payload('2020-04-03'),live:null});
 await pause();
 assert.match(ui.elements.get('#radar-results').innerHTML,/Consulta do dia indisponível/);
 assert.doesNotMatch(ui.elements.get('#radar-results').innerHTML,/Matéria do dia/);
});
