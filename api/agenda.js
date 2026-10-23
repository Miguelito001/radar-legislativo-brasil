'use strict';
const {CAMARA,getJson,send} = require('./_lib/client');
module.exports=async function(req,res){
 try{
  const url=`${CAMARA}/eventos?itens=24&pagina=1&ordem=DESC&ordenarPor=dataHoraInicio`;
  const d=await getJson(url);
  return send(res,200,{origem:'camara',consultadoEm:new Date().toISOString(),escopo:'Eventos da Câmara, não uma agenda federal unificada.',eventos:(d.dados||[]).map(e=>({id:e.id,data:e.dataHoraInicio,descricao:e.descricao||'',situacao:e.situacao||'',local:e.localCamara?.nome||'',url:e.uri||''}))});
 }catch(e){return send(res,502,{error:String(e.message||e)});}
};
