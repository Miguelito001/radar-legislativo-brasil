'use strict';
const {CAMARA,SENADO,getJson,send,clampInt,str,validType,normalizeCamara,extractSenado} = require('./_lib/client');
module.exports = async function(req,res){
 if(req.method!=='GET')return send(res,405,{error:'Método não permitido'});
 const url=new URL(req.url,'https://local.invalid');
 const fonte=url.searchParams.get('fonte')||'todas';
 if(!['todas','camara','senado'].includes(fonte))return send(res,400,{error:'Fonte inválida'});
 const page=clampInt(url.searchParams.get('pagina'),1,40,1);
 const tipo=str(url.searchParams.get('tipo')).trim().toUpperCase();
 if(tipo && !validType(tipo))return send(res,400,{error:'Tipo inválido'});
 const ano=str(url.searchParams.get('ano')).trim();
 if(ano && (!/^\d{4}$/.test(ano) || +ano<1940 || +ano>new Date().getFullYear()))return send(res,400,{error:'Ano inválido'});
 const numero=str(url.searchParams.get('numero')).trim();
 if(numero && !/^\d{1,7}$/.test(numero))return send(res,400,{error:'Número inválido'});
 const search=str(url.searchParams.get('q')).trim().toLocaleLowerCase('pt-BR').slice(0,120);
 const jobs=[];
 if(fonte!=='senado')jobs.push((async()=>{
  const u=new URL(CAMARA+'/proposicoes');
  u.searchParams.set('itens','50');u.searchParams.set('pagina',String(page));u.searchParams.set('ordenarPor','id');u.searchParams.set('ordem','DESC');
  if(tipo)u.searchParams.set('siglaTipo',tipo);
  if(ano)u.searchParams.set('ano',ano);
  if(numero)u.searchParams.set('numero',numero);
  // Busca por palavra-chave: filtro oficial da Câmara para matérias do período consultado.
  if(search && !numero)u.searchParams.set('keywords',search);
  const data=await getJson(u.toString());
  return {fonte:'camara',registros:(data.dados||[]).map(normalizeCamara),links:data.links||[]};
 })());
 if(fonte!=='camara') jobs.push((async()=>{
  const u=new URL(SENADO+'/materia/atualizadas.json');
  u.searchParams.set('numdias','3');
  const data=await getJson(u.toString());
  const list=extractSenado(data);
  return {fonte:'senado',registros:list.filter(p=>(!tipo||p.tipo===tipo)&&(!ano||p.ano===ano)&&(!numero||p.numero===numero)).slice((page-1)*50,page*50)};
 })());
 const results=await Promise.allSettled(jobs);
 const sucessos=results.filter(r=>r.status==='fulfilled').map(r=>r.value);
 const falhas=results.filter(r=>r.status==='rejected').map((r,i)=>str(r.reason?.message,'Erro na fonte'));
 if(!sucessos.length)return send(res,502,{error:'Nenhuma fonte respondeu',falhas,consultadoEm:new Date().toISOString()});
 let materias=sucessos.flatMap(x=>x.registros);
 if(search)materias=materias.filter(p=>p.origem==='camara' || [p.tipo,p.numero,p.ano,p.ementa,p.situacao].some(v=>str(v).toLocaleLowerCase('pt-BR').includes(search)));
 materias.sort((a,b)=>((b.data||'').localeCompare(a.data||'')) || (Number(b.id)-Number(a.id)));
 return send(res,200,{materias,consultadoEm:new Date().toISOString(),fontes:sucessos.map(r=>r.fonte),falhas,escopo:'Resultados consultados na API da Câmara (filtro por keywords quando informado) e lote recente do Senado (texto filtrado localmente); não é uma pesquisa integral em todas as fontes.',paginacao:{pagina:page,itens:50}, linksCamara:sucessos.find(s=>s.fonte==='camara')?.links||[]});
};
