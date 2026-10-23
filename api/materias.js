'use strict';
const {send,clampInt,str,validType}=require('./_lib/client');
const {loadDay}=require('./_lib/daily');
module.exports=async function(req,res){
 if(req.method!=='GET')return send(res,405,{error:'Método não permitido'});
 const p=new URL(req.url,'https://local.invalid').searchParams;
 const fonte=p.get('fonte')||'todas';
 if(!['todas','camara','senado'].includes(fonte))return send(res,400,{error:'Fonte inválida'});
 const tipo=str(p.get('tipo')).trim().toUpperCase();
 if(tipo&&!validType(tipo))return send(res,400,{error:'Tipo inválido'});
 const q=str(p.get('q')).trim().toLocaleLowerCase('pt-BR').slice(0,120);
 const page=clampInt(p.get('pagina'),1,100,1);
 try{
  const daily=await loadDay();
  const list=daily.materias.filter(m=>
   (fonte==='todas'||m.origem===fonte)&&(!tipo||m.tipo===tipo)&&
   (!q||[m.tipo,m.numero,m.ano,m.ementa,m.situacao,m.casa].some(x=>str(x).toLocaleLowerCase('pt-BR').includes(q))));
  return send(res,200,{...daily,materias:list.slice((page-1)*50,page*50),
   paginacao:{pagina:page,itens:50,total:list.length}});
 }catch(e){return send(res,502,{error:'Consulta oficial do dia indisponível; registros antigos não serão exibidos.'});}
};
