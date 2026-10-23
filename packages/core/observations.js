'use strict';
const crypto=require('node:crypto');
// A seleção dos campos é deliberada: timestamps da consulta não são parte do hash.
function canonical(value){
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(
  Object.keys(value).sort().map(k=>[k,canonical(value[k])])
 );
 return value;
}
function fingerprint(value){return crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');}
function identity(m){
 const source=String(m?.origem||m?.source||'').trim();
 const id=String(m?.id||m?.external_id||'').trim();
 if(!['camara','senado','congresso'].includes(source)||!/^[\d-]{1,40}$/.test(id))
   throw Error('Identificação da fonte inválida');
 return {source,id};
}
function officialState(m){
 const {source,id}=identity(m);
 const kind=String(m.tipo||'').trim();
 const number=String(m.numero||'').trim();
 const year=Number(m.ano);
 if(!kind||!number||!Number.isInteger(year)||year<0||year>2200)throw Error('Identificação legislativa incompleta');
 const official_url=String(m.url||'');
 if(!/^https:\/\//.test(official_url))throw Error('URL oficial ausente');
 return {source,id,kind,number,year,ementa:String(m.ementa||''),official_url,
  presentation:String(m.data||''),status:String(m.situacao||''),
  authors:Array.isArray(m.autores)?m.autores:[]};
}
function movementKey(source,id,raw){
 const explicit=raw?.id??raw?.idTramitacao??raw?.sequencia??raw?.sequencial;
 if(explicit!==null&&explicit!==undefined&&String(explicit))return String(explicit);
 return fingerprint({source,id,raw});
}
function utcPresentation(value){
 if(!value)return null;
 // A API informa data ou horário local, mas nem sempre fuso. Não supomos UTC.
 if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value+'T12:00:00Z';
 if(/(?:Z|[+-]\d{2}:?\d{2})$/.test(value))return value;
 return null;
}
module.exports={canonical,fingerprint,identity,officialState,movementKey,utcPresentation};
