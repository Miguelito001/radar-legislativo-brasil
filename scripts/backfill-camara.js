'use strict';
const {CAMARA,getJson,normalizeCamara}=require('../api/_lib/client');
const {openPool,migrate,saveMatters}=require('../database/client');
const MIN_YEAR=Math.max(1800,Math.min(2100,Number(process.env.BACKFILL_MIN_YEAR||2023)));
const PAGES=Math.max(1,Math.min(20,Number(process.env.BACKFILL_PAGES_PER_RUN||4)));
function nextCursor(current,hasRows,minYear=MIN_YEAR){
 if(hasRows)return {ano:current.ano,pagina:current.pagina+1,terminado:false};
 const year=current.ano-1;
 return year<minYear?{ano:current.ano,pagina:current.pagina,terminado:true}:{ano:year,pagina:1,terminado:false};
}
async function start(){
 if(!process.env.DATABASE_URL){console.log('Backfill adiado: DATABASE_URL não configurada');return;}
 const pool=openPool();
 const client=await pool.connect();
 try{
  await migrate(client);
  const key=['camara','proposicoes_por_ano'];
  const r=await client.query('select cursor_state from rl_cursors where source=$1 and stream=$2',key);
  let cursor=r.rows[0]?.cursor_state||{ano:new Date().getFullYear(),pagina:1,terminado:false};
  let processed=0;
  for(let step=0;step<PAGES;step++){
   if(cursor.terminado){console.log('Acervo anual atingiu o ano mínimo configurado.');break;}
   const u=new URL(CAMARA+'/proposicoes');
   u.searchParams.set('ano',String(cursor.ano));
   u.searchParams.set('pagina',String(cursor.pagina));
   u.searchParams.set('itens','100');
   u.searchParams.set('ordenarPor','id');
   u.searchParams.set('ordem','DESC');
   const j=await getJson(u.toString(),18000);
   const list=Array.isArray(j.dados)?j.dados:[];
   const following=nextCursor(cursor,list.length>0);
   await client.query('BEGIN');
   try{
    if(list.length){const saved=await saveMatters(client,list.map(normalizeCamara));processed+=saved.processed;}
    await client.query(`insert into rl_cursors(source,stream,cursor_state,saved_at) values($1,$2,$3::jsonb,now())
      on conflict(source,stream) do update set cursor_state=excluded.cursor_state,saved_at=now()`,
     [...key,JSON.stringify(following)]);
    await client.query('COMMIT');
   }catch(e){await client.query('ROLLBACK');throw e;}
   console.log(JSON.stringify({year:cursor.ano,page:cursor.pagina,returned:list.length,next:following}));
   cursor=following;
  }
  console.log(JSON.stringify({backfill:'ok',processed,cursor}));
 }finally{client.release();await pool.end();}
}
if(require.main===module)start().catch(e=>{console.error('Backfill interrompido:',e.message);process.exitCode=1});
module.exports={nextCursor,MIN_YEAR,PAGES};
