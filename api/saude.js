'use strict';
const {send}=require('./_lib/client');
module.exports=async function(req,res){
 if(req.method!=='GET')return send(res,405,{error:'Método não permitido'});
 try{
  const result=await require('../database/query').health();
  return send(res,200,result);
 }catch(e){
  console.error('Não foi possível consultar saúde do banco:',e.message);
  return send(res,503,{state:'degraded',database:'PostgreSQL',checkedAt:new Date().toISOString(),note:'Banco não respondeu; a camada oficial estática permanece independente.'});
 }
};
