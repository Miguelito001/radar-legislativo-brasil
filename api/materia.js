'use strict';
const {CAMARA,SENADO,getJson,send,normalizeCamara,extractSenado,crawlObjects,normalizeSenado} = require('./_lib/client');
const {onlyToday,todayKey}=require('../day');
module.exports = async function(req,res){
 const url=new URL(req.url,'https://local.invalid');
 const origem=url.searchParams.get('origem');const id=url.searchParams.get('id');
 if(!['camara','senado'].includes(origem)||!/^\d{1,12}$/.test(id||''))return send(res,400,{error:'Identificação inválida'});
 try {
  if(origem==='camara'){
   const base=CAMARA+'/proposicoes/'+id;
   const responses=await Promise.allSettled([getJson(base),getJson(base+'/tramitacoes'),getJson(base+'/votacoes?ordem=DESC&ordenarPor=dataHoraRegistro')]);
   if(responses[0].status==='rejected')throw responses[0].reason;
   const d=responses[0].value.dados;
   const materia=normalizeCamara(d);
   const tramitacoes=responses[1].status==='fulfilled'?(responses[1].value.dados||[]).map(t=>({data:t.dataHora||t.data,descricao:t.descricaoTramitacao||t.descricaoSituacao||'',despacho:t.despacho||'',orgao:t.siglaOrgao||''})):[];
   const votacoes=responses[2].status==='fulfilled'?(responses[2].value.dados||[]).map(v=>({id:String(v.id),data:v.data,descricao:v.descricao||'',resultado:v.descricaoResultado||'',aprovacao:v.aprovacao||null})):[];
   return send(res,200,{materia,detalhes:{situacao:d.statusProposicao?.descricaoSituacao||'',regime:d.statusProposicao?.regime||'',inteiroTeor:d.urlInteiroTeor||''},tramitacoes:onlyToday(tramitacoes,todayKey()),votacoes:onlyToday(votacoes,todayKey()),avisos:responses.slice(1).filter(r=>r.status==='rejected').map(r=>'Um conjunto de detalhes não pôde ser obtido.'),consultadoEm:new Date().toISOString()});
  }
  const data=await getJson(SENADO+'/materia/'+id+'.json');
  const possiveis=extractSenado(data);
  const materia=possiveis.find(x=>x.id===id)||possiveis[0];
  if(!materia)return send(res,502,{error:'Estrutura oficial sem identificação normalizável',consultadoEm:new Date().toISOString()});
  return send(res,200,{materia,detalhes:{situacao:materia.situacao},tramitacoes:[],votacoes:[],avisos:['Histórico detalhado do Senado ainda não normalizado neste protótipo. Consulte o processo na fonte oficial.'],consultadoEm:new Date().toISOString()});
 }catch(e){return send(res,502,{error:String(e.message||e),consultadoEm:new Date().toISOString()});}
};
