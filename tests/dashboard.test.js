'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const glossary=require('../glossary');
const sample=require('../data/latest.json');
test('snapshot contains verifiable official records',()=>{
 assert.ok(sample.materias.length>=10,'expected a non-empty official snapshot');
 const ids=new Set();
 for(const matter of sample.materias){
  assert.match(matter.key,/^(camara|senado):\d+$/);
  assert.equal(typeof matter.ementa,'string');
  assert.ok(matter.tipo);
  assert.ok(matter.numero);
  assert.ok(matter.ano);
  assert.ok(!ids.has(matter.key),'duplicated official id '+matter.key);
  ids.add(matter.key);
 }
});
test('dashboard initializes and renders real snapshot when API fails',async()=>{
 const source=fs.readFileSync(path.resolve(__dirname,'../app.js'),'utf8');
 const elements=new Map();
 const fake=()=>{
  const x={innerHTML:'',textContent:'',value:'',disabled:false,hidden:false,dataset:{},style:{},classList:{add(){},remove(){},toggle(){},contains(){return false}},addEventListener(){},append(){},setAttribute(){},removeAttribute(){},getBoundingClientRect(){return {left:0,right:0,top:0,bottom:0}},contains(){return false}};
  return x;
 };
 const document={
  querySelector(selector){if(!elements.has(selector))elements.set(selector,fake());return elements.get(selector)},
  querySelectorAll(){return []},
  addEventListener(){},
  createElement(){return fake()}
 };
 const window={addEventListener(){},scrollTo(){},innerWidth:1100,innerHeight:900};
 let liveCalled=false;
 const context={document,window,console,URL,URLSearchParams,Intl,Date,Map,Set,Promise,AbortController,AbortSignal,setTimeout,clearTimeout,globalThis:null,fetch:async(path)=>{
  if(String(path).startsWith('/data/latest.json'))return {ok:true,json:async()=>sample};
  if(String(path).startsWith('/api/materias')){liveCalled=true;return {ok:false,status:502,json:async()=>({error:'Test upstream unavailable'})};}
  return {ok:false,status:404,json:async()=>({error:'Not found'})};
 }};
 context.globalThis=context;
 context.RadarGlossary=glossary;
 vm.runInNewContext(source,context,{filename:'app.js'});
 await new Promise(resolve=>setTimeout(resolve,50));
 assert.ok(liveCalled,'live request should be attempted after snapshot');
 const html=elements.get('#radar-results').innerHTML;
 assert.match(html,/matter-card/);
 assert.match(html,/Fonte oficial/);
 assert.notEqual(elements.get('#count-matters').textContent,'—');
 assert.match(elements.get('#results-summary').textContent,/amostra|parcial|Amostra/i);
});
