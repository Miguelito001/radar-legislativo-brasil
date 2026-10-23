'use strict';
const {send}=require('./_lib/client');
const {findAuthors}=require('./_lib/autoria');
module.exports=async function(req,res){
 if(req.method!=='GET')return send(res,405,{error:'Método não permitido'});
 const url=new URL(req.url,'https://local.invalid');
 const origem=url.searchParams.get('origem');
 const id=url.searchParams.get('id');
 if(!['camara','senado'].includes(origem)||!/^\d{1,12}$/.test(id||''))return send(res,400,{error:'Identificação inválida'});
 try{
  const autores=await findAuthors(origem,id);
  return send(res,200,{autores,consultadoEm:new Date().toISOString(),origem});
 }catch{
  return send(res,502,{error:'A fonte oficial não disponibilizou a autoria nesta consulta.',consultadoEm:new Date().toISOString()});
 }
};
