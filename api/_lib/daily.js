'use strict';
const {CAMARA,SENADO,getJson,normalizeCamara,extractSenado}=require('./client');
const {todayKey,onlyToday}=require('../../day');

function dateUrl(path,day,{page=1,items=100,order='DESC',field='id'}={}){
 const u=new URL(CAMARA+path);
 u.searchParams.set('dataInicio',day);
 u.searchParams.set('dataFim',day);
 u.searchParams.set('itens',String(items));
 u.searchParams.set('pagina',String(page));
 u.searchParams.set('ordem',order);
 u.searchParams.set('ordenarPor',field);
 return u.toString();
}
async function camaraMatters(day,get=getJson){
 const first=await get(dateUrl('/proposicoes',day,{items:100}));
 const records=[...(first.dados||[])];
 // Paginar enquanto necessário, com limite por coleta e cobertura explicitamente parcial.
 for(let page=2;page<=4&&records.length===(page-1)*100;page++){
  const j=await get(dateUrl('/proposicoes',day,{page,items:100}));
  records.push(...(j.dados||[]));
  if((j.dados||[]).length<100)break;
 }
 const matters=onlyToday(records.map(normalizeCamara),day);
 return {matters,limitReached:records.length>=400};
}
async function senadoPresentations(day,get=getJson){
 const u=new URL(SENADO+'/materia/atualizadas.json');
 u.searchParams.set('numdias','2');
 const data=await get(u.toString());
 // A API lista matérias atualizadas, mas DataApresentacao indica SOMENTE a apresentação.
 // Não identificar atualização como tramitação sem um ato oficial identificado por data.
 return onlyToday(extractSenado(data),day);
}
async function camaraVotes(day,get=getJson){
 const payload=await get(dateUrl('/votacoes',day,{items:100,field:'dataHoraRegistro'}));
 const votes=(payload.dados||[]).map(v=>({
  id:String(v.id),data:String(v.data||v.dataHoraRegistro||''),
  descricao:String(v.descricao||''),resultado:String(v.descricaoResultado||''),
  aprovacao:v.aprovacao??null,orgao:String(v.siglaOrgao||''),
  url:CAMARA+'/votacoes/'+encodeURIComponent(v.id),origem:'camara'
 }));
 return {votes:onlyToday(votes,day),limitReached:(payload.dados||[]).length>=100};
}
async function camaraEvents(day,get=getJson){
 const payload=await get(dateUrl('/eventos',day,{items:100,field:'dataHoraInicio',order:'ASC'}));
 const events=(payload.dados||[]).map(e=>({
  id:e.id,data:String(e.dataHoraInicio||''),descricao:String(e.descricao||''),
  situacao:String(e.situacao||''),local:String(e.localCamara?.nome||''),
  url:CAMARA+'/eventos/'+encodeURIComponent(e.id),origem:'camara'
 }));
 return {events:onlyToday(events,day),limitReached:(payload.dados||[]).length>=100};
}
async function loadDay({instant=new Date(),get=getJson}={}){
 const day=todayKey(instant);
 const tasks=[
  ['camara-proposicoes',()=>camaraMatters(day,get)],
  ['senado-apresentacoes',()=>senadoPresentations(day,get)],
  ['camara-votacoes',()=>camaraVotes(day,get)],
  ['camara-eventos',()=>camaraEvents(day,get)]
 ];
 const results=await Promise.allSettled(tasks.map(x=>x[1]()));
 const successes=[],failures=[],records={materias:[],votacoes:[],eventos:[]};
 for(let i=0;i<results.length;i++){
  const name=tasks[i][0],r=results[i];
  if(r.status==='rejected'){
   failures.push({fonte:name,erro:String(r.reason?.message||'Consulta indisponível').slice(0,180)});
   continue;
  }
  successes.push(name);
  if(name==='camara-proposicoes'){records.materias.push(...r.value.matters);if(r.value.limitReached)failures.push({fonte:name,erro:'Mais de 400 registros no dia; recorte pode estar incompleto'});}
  if(name==='senado-apresentacoes')records.materias.push(...r.value);
  if(name==='camara-votacoes'){records.votacoes=r.value.votes;if(r.value.limitReached)failures.push({fonte:name,erro:'Votações acima do limite de paginação da coleta'});}
  if(name==='camara-eventos'){records.eventos=r.value.events;if(r.value.limitReached)failures.push({fonte:name,erro:'Eventos acima do limite de paginação da coleta'});}
 }
 if(!successes.length)throw new Error('Nenhuma fonte oficial respondeu à consulta do dia.');
 const unique=new Map(records.materias.map(x=>[x.key,x]));
 return {
  formato:'radar-legislativo-hoje-v1',dia:day,
  consultadoEm:new Date().toISOString(),fuso:'America/Sao_Paulo',
  escopo:'Apenas apresentações de matérias, votações e eventos com data do dia no horário de Brasília; não representa todas as tramitações federais. Senado: apresentações entre matérias atualizadas. Sem cobertura integral de votações e eventos do Senado ou de matérias do Congresso Nacional.',
  fontesConsultadas:successes, falhas:failures,
  materias:[...unique.values()].sort((a,b)=>String(b.data||'').localeCompare(String(a.data||''))),
  votacoes:records.votacoes.sort((a,b)=>String(b.data||'').localeCompare(String(a.data||''))),
  eventos:records.eventos.sort((a,b)=>String(a.data||'').localeCompare(String(b.data||'')))
 };
}
module.exports={dateUrl,camaraMatters,senadoPresentations,camaraVotes,camaraEvents,loadDay};
