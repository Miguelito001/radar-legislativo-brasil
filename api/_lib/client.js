'use strict';
const CAMARA = 'https://dadosabertos.camara.leg.br/api/v2';
const SENADO = 'https://legis.senado.leg.br/dadosabertos';
const allowed = [new URL(CAMARA).origin,new URL(SENADO).origin];
const memory = new Map();
const TTL = 90_000;
async function getJson(url, timeout = 9000) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !allowed.includes(parsed.origin)) throw new Error('Origem remota não autorizada');
  const c = memory.get(url);
  if (c && Date.now()-c.at < TTL) return c.value;
  const response = await fetch(url,{headers:{Accept:'application/json','User-Agent':'RadarLegislativoBrasil/0.1 (dados publicos)'},signal:AbortSignal.timeout(timeout)});
  if (!response.ok) throw new Error(`Fonte oficial indisponível (HTTP ${response.status})`);
  const data = await response.json();
  memory.set(url,{at:Date.now(),value:data});
  if (memory.size > 150) memory.delete(memory.keys().next().value);
  return data;
}
function send(res, status, data) {
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','public, s-maxage=90, stale-while-revalidate=120');
  res.end(JSON.stringify(data));
}
function str(x, fallback='') {return x === null || x === undefined ? fallback : String(x);}
function clampInt(x, min,max,fallback) {const v=Number(x);return Number.isInteger(v)?Math.max(min,Math.min(max,v)):fallback;}
function validType(x) {return /^[A-Z0-9]{1,9}$/.test(str(x));}
function normalizeCamara(p){
  return {key:'camara:'+p.id, id:str(p.id), origem:'camara', casa:'Câmara',tipo:str(p.siglaTipo),numero:str(p.numero),ano:str(p.ano),ementa:str(p.ementa),data:str(p.dataApresentacao),situacao:str(p.statusProposicao?.descricaoSituacao),url:`https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${encodeURIComponent(p.id)}`,api:str(p.uri)};
}
function crawlObjects(obj,accept,limit=6000){
 const stack=[obj]; const found=[]; let seen=0;
 while(stack.length && seen++<limit) {
  const value=stack.pop(); if(!value||typeof value!=='object')continue;
  if(accept(value))found.push(value);
  for(const [k,v] of Object.entries(value)) if(v&&typeof v==='object' && k!=='@attributes') Array.isArray(v)?stack.push(...v):stack.push(v);
 }
 return found;
}
function normalizeSenado(node){
 const iden=node.IdentificacaoMateria||node.Identificacao||node;
 const basic=node.DadosBasicosMateria||node.DadosBasicos||node;
 const code=iden.CodigoMateria||iden.Codigo||node.CodigoMateria;
 const sigla=iden.SiglaSubtipoMateria||iden.SiglaMateria||iden.SiglaTipoMateria||node.SiglaSubtipoMateria;
 const numero=iden.NumeroMateria||node.NumeroMateria;
 const ano=iden.AnoMateria||node.AnoMateria;
 if(!code||!sigla||!numero||!ano)return null;
 return {key:'senado:'+code,id:str(code),origem:'senado',casa:'Senado',tipo:str(sigla),numero:str(numero),ano:str(ano),ementa:str(basic.EmentaMateria||node.EmentaMateria),data:str(basic.DataApresentacao||node.DataApresentacao),situacao:str(node.DescricaoSituacao||node.SituacaoAtual?.DescricaoSituacao),url:`https://www25.senado.leg.br/web/atividade/materias/-/materia/${encodeURIComponent(code)}`};
}
function extractSenado(data) {
 const items=crawlObjects(data,obj=>!!obj.IdentificacaoMateria || (!!obj.CodigoMateria && !!obj.NumeroMateria && !!obj.AnoMateria));
 const result=new Map();
 for (const node of items) {const n=normalizeSenado(node); if(!n)continue; const prev=result.get(n.key); if(!prev || (n.ementa.length>prev.ementa.length)) result.set(n.key,n);}
 return [...result.values()];
}
module.exports={CAMARA,SENADO,getJson,send,str,clampInt,validType,normalizeCamara,normalizeSenado,extractSenado,crawlObjects};
