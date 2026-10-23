'use strict';
const {send}=require('./_lib/client');
const {loadDay}=require('./_lib/daily');
module.exports=async function(req,res){
 if(req.method!=='GET')return send(res,405,{error:'Método não permitido'});
 try{
  const today=await loadDay();
  return send(res,200,{dia:today.dia,consultadoEm:today.consultadoEm,origem:'camara',
   escopo:today.escopo,votacoes:today.votacoes, falhas:today.falhas});
 }catch{return send(res,502,{error:'Votações do dia indisponíveis'});}
};
