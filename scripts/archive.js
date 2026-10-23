'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {officialState,fingerprint}=require('../packages/core/observations');

function archivalState(matter){
 const {authors,...canonical}=officialState(matter);
 return canonical;
}
function changes(previous,latest,observedAt){
 const before=new Map((previous?.materias||[]).filter(x=>x?.key).map(x=>{
  try{return [x.key,fingerprint(archivalState(x))]}catch{return [x.key,null]}
 }));
 const records=[];
 const seen=new Set();
 for(const current of latest.materias||[]){
  if(!current?.key||seen.has(current.key))continue;
  seen.add(current.key);
  try{
   const state=archivalState(current),hash=fingerprint(state),old=before.get(current.key);
   if(old===hash)continue;
   records.push({
    schema:1,type:old===undefined?'observed_first_in_sample':'observed_change',
    source:state.source,external_id:state.id,observed_at:observedAt,
    fingerprint:hash,previous_fingerprint:old||null,
    // Não é a data do acontecimento jurídico, e sim a informação trazida pela matéria.
    source_presentation_at:state.presentation||null,state
   });
  }catch(e){console.warn('Arquivamento omitido para registro inválido:',current.key,e.message);}
 }
 return records;
}
function archive(previous,latest,stamp){
 const date=new Date(stamp);
 if(Number.isNaN(date.getTime()))throw Error('Data da observação inválida');
 const datePart=date.toISOString().slice(0,10);
 const [year,month,day]=datePart.split('-');
 const dir=path.resolve(__dirname,'../data/archive',year,month);
 const filename=path.join(dir,day+'.ndjson');
 const additions=changes(previous,latest,date.toISOString());
 if(!additions.length)return {filename:null,count:0};
 fs.mkdirSync(dir,{recursive:true});
 // Capturas incrementais; nenhuma remoção do lote é interpretada como arquivamento jurídico.
 const text=additions.map(e=>JSON.stringify(e)).join('\n')+'\n';
 fs.appendFileSync(filename,text);
 return {filename,count:additions.length};
}
module.exports={archivalState,changes,archive};
