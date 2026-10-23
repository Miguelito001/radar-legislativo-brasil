'use strict';
const {CAMARA,getJson,send,clampInt} = require('./_lib/client');
module.exports=async function(req,res){
 const page=clampInt(new URL(req.url,'https://local.invalid').searchParams.get('pagina'),1,30,1);
 try{
  const url=`${CAMARA}/votacoes?itens=30&pagina=${page}&ordem=DESC&ordenarPor=dataHoraRegistro`;
  const payload=await getJson(url);
  return send(res,200,{origem:'camara',consultadoEm:new Date().toISOString(),escopo:'Votações da Câmara; Senado e Congresso ainda não integrados nesta consulta.',votacoes:(payload.dados||[]).map(v=>({id:String(v.id),data:v.data,dataHoraRegistro:v.dataHoraRegistro,descricao:v.descricao||'',resultado:v.descricaoResultado||'',aprovacao:v.aprovacao??null,placar:v.placar||null,orgao:v.siglaOrgao||'',url:`https://dadosabertos.camara.leg.br/api/v2/votacoes/${encodeURIComponent(v.id)}`}))});
 }catch(e){return send(res,502,{error:String(e.message||e)});}
};
