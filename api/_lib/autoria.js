'use strict';
const {CAMARA,SENADO,getJson,str}=require('./client');
function camaraAuthors(payload){
 const records=Array.isArray(payload?.dados)?payload.dados:[];
 const seen=new Set();
 return records.map(a=>({
  nome:str(a.nome).trim(),
  tipo:str(a.tipo).trim(),
  partido:str(a.siglaPartido).trim(),
  uf:str(a.siglaUf).trim()
 })).filter(a=>{const key=a.nome.toLocaleLowerCase('pt-BR');if(!key||seen.has(key))return false;seen.add(key);return true});
}
function senadoAuthors(payload){
 const entries=[];
 const visited=new Set();
 const stack=[payload];
 let steps=0;
 while(stack.length&&steps++<3500){
  const value=stack.pop();
  if(!value||typeof value!=='object'||visited.has(value))continue;
  visited.add(value);
  if(Array.isArray(value)){for(const item of value)stack.push(item);continue}
  // A rota de autoria contém apenas autores da matéria, nunca relatores nem votantes.
  const p=value.IdentificacaoParlamentar||{};
  const a=value.IdentificacaoAutor||{};
  const nome=str(value.NomeAutor||value.nomeAutor||a.NomeAutor||value.NomeParlamentar||p.NomeParlamentar||p.NomeCompletoParlamentar).trim();
  if(nome)entries.push({nome,tipo:str(value.DescricaoTipoAutor||value.SiglaTipoAutor),partido:str(p.SiglaPartidoParlamentar||value.SiglaPartido),uf:str(p.UfParlamentar||value.UfAutor)});
  for(const child of Object.values(value))if(child&&typeof child==='object')stack.push(child);
 }
 const unique=new Set();
 return entries.filter(a=>{const name=a.nome.toLocaleLowerCase('pt-BR');if(unique.has(name))return false;unique.add(name);return true});
}
async function findAuthors(origem,id){
 if(origem==='camara'){
  const data=await getJson(CAMARA+'/proposicoes/'+id+'/autores');
  return camaraAuthors(data);
 }
 const data=await getJson(SENADO+'/materia/autoria/'+id+'.json');
 return senadoAuthors(data);
}
module.exports={camaraAuthors,senadoAuthors,findAuthors};
