'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const {officialState,fingerprint,utcPresentation,movementKey}=require('../packages/core/observations');
function connectionString(){return String(process.env.DATABASE_URL||'').trim();}
function openPool(){
 if(!connectionString())throw Error('DATABASE_URL não configurada');
 // Require lazy: o site estático continua funcionando sem um banco provisionado.
 const {Pool}=require('pg');
 return new Pool({connectionString:connectionString(),max:3,connectionTimeoutMillis:10000,idleTimeoutMillis:15000,statement_timeout:30000,application_name:'radar-legislativo'});
}
async function migrate(client){
 const sql=await fs.readFile(path.join(__dirname,'migrations','001_core.sql'),'utf8');
 await client.query(sql);
}
function normalizeBatch(matters){
 const byKey=new Map();
 for(const m of matters){
  try{
   const state=officialState(m);
   const {authors,...record}=state;
   const hash=fingerprint(record);
   byKey.set(state.source+':'+state.id,{
    source:state.source,external_id:state.id,kind:state.kind,matter_number:state.number,matter_year:state.year,
    ementa:state.ementa,official_url:state.official_url,presentation_at:utcPresentation(state.presentation),
    status_text:state.status,authors:state.authors||[],current_hash:hash,
    latest_raw:m
   });
  }catch(e){console.warn('Registro ignorado por validação:',String(m?.key||''),e.message);}
 }
 return [...byKey.values()];
}
const SAVE_MATTERS=`
WITH incoming AS (
 SELECT * FROM jsonb_to_recordset($1::jsonb) AS r (
  source text,external_id text,kind text,matter_number text,matter_year int,
  ementa text,official_url text,presentation_at timestamptz,status_text text,
  authors jsonb,current_hash text,latest_raw jsonb
 )
),
old AS (
 SELECT i.source,i.external_id,i.current_hash,i.latest_raw,
        (m.current_hash IS DISTINCT FROM i.current_hash) AS changed
 FROM incoming i
 LEFT JOIN rl_matters m ON m.source=i.source AND m.external_id=i.external_id
),
changed AS (
 INSERT INTO rl_matters (
  source,external_id,kind,matter_number,matter_year,ementa,official_url,
  presentation_at,status_text,authors,current_hash,latest_raw,
  first_observed_at,last_observed_at,current_changed_at
 )
 SELECT source,external_id,kind,matter_number,matter_year,ementa,official_url,
  presentation_at,status_text,coalesce(authors,'[]'::jsonb),current_hash,latest_raw,
  now(),now(),now() FROM incoming
 ON CONFLICT (source,external_id) DO UPDATE SET
  kind=excluded.kind,matter_number=excluded.matter_number,
  matter_year=excluded.matter_year,ementa=excluded.ementa,
  official_url=excluded.official_url,presentation_at=excluded.presentation_at,
  status_text=excluded.status_text,
  authors=case when jsonb_array_length(excluded.authors)>0 then excluded.authors else rl_matters.authors end,
  current_hash=excluded.current_hash,latest_raw=excluded.latest_raw,
  last_observed_at=now(),
  current_changed_at=case when rl_matters.current_hash IS DISTINCT FROM excluded.current_hash then now() else rl_matters.current_changed_at end
 RETURNING source,external_id,current_hash
),
observations AS (
 INSERT INTO rl_observations(source,external_id,fingerprint,observed_at,snapshot)
 SELECT o.source,o.external_id,o.current_hash,now(),o.latest_raw
 FROM old o JOIN changed c ON c.source=o.source AND c.external_id=o.external_id
 WHERE o.changed
 RETURNING id
)
SELECT (SELECT count(*)::int FROM changed) AS processed,
       (SELECT count(*)::int FROM observations) AS revisions
`;
async function saveMatters(client,matters){
 const batch=normalizeBatch(matters);
 if(!batch.length)throw Error('Nenhuma matéria válida para importar');
 // Uma única operação transacional reduz latência e impede eventos órfãos.
 const result=await client.query(SAVE_MATTERS,[JSON.stringify(batch)]);
 return {...result.rows[0],invalid:matters.length-batch.length};
}
async function saveMovements(client,source,id,movements){
 if(source!=='camara')throw Error('Ainda não foi validado um adaptador para a tramitação desta fonte');
 let inserted=0;
 for(const m of movements){
  const description=String(m.descricaoTramitacao||m.descricaoSituacao||m.descricao||'');
  const key=movementKey(source,id,m);
  const date=utcPresentation(m.dataHora||m.data||'');
  const result=await client.query(`INSERT INTO rl_movements(
   source,external_id,official_key,occurred_at,office,official_description,official_dispatch,raw)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
   ON CONFLICT(source,external_id,official_key) DO UPDATE SET
    raw=excluded.raw,official_description=excluded.official_description,
    office=excluded.office,official_dispatch=excluded.official_dispatch,
    fetched_at=now()
   RETURNING (xmax=0) AS inserted`,
   [source,id,key,date,String(m.siglaOrgao||''),description,String(m.despacho||''),JSON.stringify(m)]);
  if(result.rows[0]?.inserted)inserted++;
 }
 return inserted;
}
async function saveVotings(client,rows){
 let count=0;
 for(const v of rows){
  if(!v?.id)continue;
  const r=await client.query(`INSERT INTO rl_votings(source,external_id,voted_at,official_description,official_result,raw)
   VALUES ('camara',$1,$2,$3,$4,$5::jsonb)
   ON CONFLICT(source,external_id) DO UPDATE SET
   voted_at=excluded.voted_at,official_description=excluded.official_description,
   official_result=excluded.official_result,raw=excluded.raw,fetched_at=now()
   RETURNING external_id`,[
     String(v.id),utcPresentation(v.data||''),
     String(v.descricao||''),String(v.resultado||''),JSON.stringify(v)
   ]);
  if(r.rows.length)count++;
 }
 return count;
}
module.exports={connectionString,openPool,migrate,normalizeBatch,saveMatters,saveMovements,saveVotings};
