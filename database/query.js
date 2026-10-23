'use strict';
const {connectionString,openPool}=require('./client');
const {storageStatus}=require('./budget');
let pool;
function getPool(){if(!connectionString())return null;if(!pool)pool=openPool();return pool;}
function normalize(row){
 return {key:row.source+':'+row.external_id,id:row.external_id,origem:row.source,
  casa:row.source==='camara'?'Câmara':row.source==='senado'?'Senado':'Congresso',
  tipo:row.kind,numero:row.matter_number,ano:row.matter_year===0?'':String(row.matter_year),
  ementa:row.ementa||'',situacao:row.status_text||'',
  data:row.presentation_at?new Date(row.presentation_at).toISOString():String(row.latest_raw?.data||''),
  autores:Array.isArray(row.authors)?row.authors:[],
  url:row.official_url,observadoEm:row.last_observed_at};
}
async function searchMatters({fonte='todas',tipo='',ano='',numero='',q='',pagina=1}={}){
 const p=getPool();if(!p)throw Error('Banco ainda não configurado');
 const limit=50,page=Math.max(1,Math.min(10000,Number(pagina)||1));
 const where=[],args=[];
 function condition(sql,value){args.push(value);where.push(sql.replaceAll('?', '$'+args.length));}
 if(fonte!=='todas')condition('source=?',fonte);
 if(tipo)condition('kind=?',tipo);
 if(ano)condition('matter_year=?',Number(ano));
 if(numero)condition('matter_number=?',String(numero));
 // Treat all input as data, never interpolate query text into SQL.
 if(q){
  const text='%'+String(q).slice(0,120).replace(/[\\%_]/g,'\\$&')+'%';
  args.push(text);const n=args.length;
  where.push('(ementa ilike $'+n+" escape '\\' or matter_number ilike $"+n+" escape '\\' or kind ilike $"+n+" escape '\\')");
 }
 const filter=where.length?' WHERE '+where.join(' AND '):'';
 const count=await p.query('select count(*)::int as total from rl_matters'+filter,args);
 const values=[...args,limit,(page-1)*limit];
 const rows=await p.query('select * from rl_matters'+filter+
  ' order by last_observed_at desc,source,external_id desc limit $'+(args.length+1)+' offset $'+(args.length+2),values);
 return {materias:rows.rows.map(normalize),fontes:['PostgreSQL'],falhas:[],
  consultadoEm:new Date().toISOString(),
  escopo:'Matérias efetivamente ingeridas e preservadas no banco, não representa necessariamente o acervo completo das três Casas.',
  paginacao:{pagina:page,itens:limit,total:count.rows[0].total},total:count.rows[0].total,persistente:true};
}
async function matterDetails(source,id){
 const p=getPool();if(!p)throw Error('Banco não configurado');
 const r=await p.query('select * from rl_matters where source=$1 and external_id=$2',[source,id]);
 if(!r.rows.length)return null;
 const row=r.rows[0];
 const move=await p.query('select occurred_at,official_description,official_dispatch,office from rl_movements where source=$1 and external_id=$2 order by occurred_at asc nulls last,official_key',[source,id]);
 const observations=await p.query('select fingerprint,observed_at from rl_observations where source=$1 and external_id=$2 order by observed_at desc limit 30',[source,id]);
 return {materia:normalize(row),detalhes:{situacao:row.status_text||'',inteiroTeor:row.latest_raw?.urlInteiroTeor||''},
  tramitacoes:move.rows.map(x=>({data:x.occurred_at,descricao:x.official_description,despacho:x.official_dispatch,orgao:x.office})),
  votacoes:[],observacoes:observations.rows,
  avisos:['O histórico de tramitações reflete apenas os atos já importados. Consulte a ficha oficial para conferir a cobertura.'],
  consultadoEm:new Date().toISOString(),persistente:true};
}
async function health(){
 const p=getPool();
 if(!p)return {state:'not_configured',database:'PostgreSQL',note:'Falta DATABASE_URL; amostra estática continua ativa'};
 const counts=await p.query("select source,count(*)::int as items,max(last_observed_at) as latest from rl_matters group by source");
 const moves=await p.query('select source,count(*)::int as items from rl_movements group by source');
 const storage=await storageStatus(p);
 return {state:storage.blocked?'read_only_limit':'ok',database:'PostgreSQL',sources:counts.rows,movements:moves.rows,storage,checkedAt:new Date().toISOString()};
}
module.exports={getPool,normalize,searchMatters,matterDetails,health};
