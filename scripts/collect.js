'use strict';
// Snapshot de segurança: apenas respostas oficiais, sem matérias simuladas.
// Este arquivo é usado pelo site se suas funções de API ficarem indisponíveis.
const fs=require('node:fs');
const path=require('node:path');
const {CAMARA,SENADO,normalizeCamara,extractSenado}=require('../api/_lib/client');
const {findAuthors}=require('../api/_lib/autoria');
const {archive}=require('./archive');

async function official(url){
 let error;
 for(let attempt=0;attempt<2;attempt++){
  try{
   const response=await fetch(url,{headers:{Accept:'application/json','User-Agent':'RadarLegislativoBrasil/0.3 (public-data-snapshot)'},signal:AbortSignal.timeout(18000)});
   if(!response.ok)throw Error('HTTP '+response.status);
   return await response.json();
  }catch(e){error=e;if(attempt===0)await new Promise(resolve=>setTimeout(resolve,800));}
 }
 throw Error(error?.message||'Fonte indisponível');
}
function onePerKey(records){
 const seen=new Set();
 return records.filter(item=>{
  if(!item?.key||seen.has(item.key))return false;
  seen.add(item.key);return true;
 });
}
function readExisting(filename){try{return JSON.parse(fs.readFileSync(filename,'utf8'))}catch{return null}}
function writeJson(filename,data){
 const existing=readExisting(filename);
 if(existing){
  const old={...existing},incoming={...data};
  delete old.consultadoEm;delete incoming.consultadoEm;
  if(JSON.stringify(old)===JSON.stringify(incoming))return false;
 }
 fs.mkdirSync(path.dirname(filename),{recursive:true});
 fs.writeFileSync(filename,JSON.stringify(data,null,2)+'\n');
 return true;
}
async function main(){
 const folder=path.resolve(__dirname,'../data');
 const previous=readExisting(path.join(folder,'latest.json'));
 const stamped=new Date().toISOString();
 const checks=[
  {id:'camara',run:async()=>{
    const pages=await Promise.all([1,2,3].map(async page=>{
      const u=new URL(CAMARA+'/proposicoes');u.searchParams.set('itens','50');u.searchParams.set('pagina',String(page));u.searchParams.set('ordenarPor','id');u.searchParams.set('ordem','DESC');
      return (await official(u.toString())).dados||[];
    }));
    return pages.flat().map(normalizeCamara);
  }},
  {id:'senado',run:async()=>{
    const u=new URL(SENADO+'/materia/atualizadas.json');u.searchParams.set('numdias','7');
    return extractSenado(await official(u.toString())).slice(0,400);
  }},
  {id:'votacoes',run:async()=>{
    const u=new URL(CAMARA+'/votacoes');u.searchParams.set('itens','40');u.searchParams.set('pagina','1');u.searchParams.set('ordenarPor','dataHoraRegistro');u.searchParams.set('ordem','DESC');
    const j=await official(u.toString());
    return (j.dados||[]).map(v=>({id:String(v.id),data:v.data||v.dataHoraRegistro,descricao:v.descricao||'',resultado:v.descricaoResultado||'',aprovacao:v.aprovacao??null,url:'https://dadosabertos.camara.leg.br/api/v2/votacoes/'+encodeURIComponent(v.id)}));
  }},
  {id:'agenda',run:async()=>{
    const u=new URL(CAMARA+'/eventos');u.searchParams.set('itens','30');u.searchParams.set('pagina','1');u.searchParams.set('ordenarPor','dataHoraInicio');u.searchParams.set('ordem','DESC');
    const j=await official(u.toString());
    return (j.dados||[]).map(e=>({id:e.id,data:e.dataHoraInicio,descricao:e.descricao||'',situacao:e.situacao||'',local:e.localCamara?.nome||'',url:e.uri||''}));
  }}
 ];
 const results=await Promise.allSettled(checks.map(c=>c.run()));
 const ok={};const problems=[];
 for(let i=0;i<checks.length;i++){
  const r=results[i],label=checks[i].id;
  if(r.status==='fulfilled'&&Array.isArray(r.value)&&r.value.length){ok[label]=r.value;console.log(label+': '+r.value.length+' registros');}
  else {problems.push(label+': '+(r.status==='rejected'?r.reason?.message:'lista vazia'));console.warn('WARN '+problems.at(-1));}
 }
 const existingByOrigin=Object.groupBy?Object.groupBy(previous?.materias||[],m=>m.origem):{
    camara:(previous?.materias||[]).filter(m=>m.origem==='camara'),
    senado:(previous?.materias||[]).filter(m=>m.origem==='senado')
 };
 const camara=ok.camara||existingByOrigin.camara||[];
 const senado=ok.senado||existingByOrigin.senado||[];
 const materias=onePerKey([...camara,...senado]).sort((a,b)=>String(b.data||'').localeCompare(String(a.data||''))).slice(0,650);
 if(materias.length<10)throw Error('Snapshot recusado: somente '+materias.length+' registros; os dados anteriores serão preservados.');
 // Inclui nomes oficiais dos autores sem exigir que a função de API do site responda.
 const previousAuthors=new Map((previous?.materias||[]).filter(p=>Array.isArray(p.autores)&&p.autores.length).map(p=>[p.key,p.autores]));
 for(const p of materias)if(previousAuthors.has(p.key))p.autores=previousAuthors.get(p.key);
 const featured=[...materias.filter(p=>p.origem==='camara').slice(0,24),...materias.filter(p=>p.origem==='senado').slice(0,14)].filter(p=>!p.autores?.length);
 let cursor=0,foundAuthors=0;
 await Promise.all(Array.from({length:Math.min(4,featured.length)},async()=>{
  while(cursor<featured.length){
   const p=featured[cursor++];
   try{const authors=await findAuthors(p.origem,p.id);if(authors.length){p.autores=authors;foundAuthors++;}}
   catch(e){console.warn('Autoria não obtida para '+p.key+': '+String(e.message||e));}
  }
 }));
 console.log('autorias novas obtidas: '+foundAuthors+'; registros com autoria: '+materias.filter(p=>p.autores?.length).length);
 const successSources=['camara','senado'].filter(x=>ok[x]);
 const snapshot={
  formato:'radar-legislativo-snapshot-v1',
  consultadoEm:stamped,
  escopo:'Amostra das 150 proposições mais recentemente cadastradas na Câmara e de até 400 matérias atualizadas na última semana no Senado. Não corresponde ao acervo completo ou a um feed de movimentações.',
  fontes:['camara','senado'].filter(x=>ok[x]||existingByOrigin[x]?.length),
  fontesConsultadas:successSources,
  falhas:problems,
  materias,
  paginacao:{pagina:1,itens:materias.length},
  origens:{camara:camara.length,senado:senado.length}
 };
 const archived=archive(previous,snapshot,stamped);
 console.log('Observações incrementais arquivadas: '+archived.count);
 writeJson(path.join(folder,'latest.json'),snapshot);
 if(ok.votacoes?.length){writeJson(path.join(folder,'votacoes.json'),{consultadoEm:stamped,origem:'camara',escopo:'Amostra das votações retornadas pela Câmara dos Deputados.',votacoes:ok.votacoes});}
 if(ok.agenda?.length){writeJson(path.join(folder,'agenda.json'),{consultadoEm:stamped,origem:'camara',escopo:'Amostra de eventos retornados pela Câmara dos Deputados.',eventos:ok.agenda});}
 console.log(JSON.stringify({ok:true,total:materias.length,camara:camara.length,senado:senado.length,updated:stamped,issues:problems}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
