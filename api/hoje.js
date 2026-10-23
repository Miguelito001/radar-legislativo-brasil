'use strict';
const {send}=require('./_lib/client');
const {loadDay}=require('./_lib/daily');
module.exports=async function(req,res){
 if(req.method!=='GET')return send(res,405,{error:'Método não permitido'});
 try{return send(res,200,await loadDay());}
 catch(e){
  console.error('Radar do dia indisponível:',e.message);
  return send(res,502,{error:'As fontes oficiais não responderam à consulta do dia. Não exibir registros antigos como se fossem de hoje.'});
 }
};
