'use strict';
const crypto=require('node:crypto');
const {CAMARA,SENADO,getJson,normalizeCamara,extractSenado}=require('./_lib/client');
const {openPool,migrate,saveMatters}=require('../database/client');
function reply(res,status,obj){
 res.statusCode=status;
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','no-store');
 res.end(JSON.stringify(obj));
}
function isAuthorized(auth,secret){
 if(!secret||typeof auth!=='string')return false;
 const actual=Buffer.from(auth);
 const expected=Buffer.from('Bearer '+secret);
 return actual.length===expected.length&&crypto.timingSafeEqual(actual,expected);
}
async function collect(){
 const jobs=[
  ['camara',async()=>{
   const pages=await Promise.all([1,2].map(async p=>{
    const url=new URL(CAMARA+'/proposicoes');
    url.searchParams.set('itens','50');
    url.searchParams.set('pagina',String(p));
    url.searchParams.set('ordenarPor','id');
    url.searchParams.set('ordem','DESC');
    const data=await getJson(url.toString(),13000);
    return (data.dados||[]).map(normalizeCamara);
   }));
   return pages.flat();
  }],
  ['senado',async()=>{
   const data=await getJson(SENADO+'/materia/atualizadas.json?numdias=7',13000);
   return extractSenado(data).slice(0,500);
  }]
 ];
 const results=await Promise.allSettled(jobs.map(x=>x[1]()));
 return jobs.map(([source],i)=>({
  source,
  records:results[i].status==='fulfilled'?results[i].value:[],
  error:results[i].status==='rejected'?String(results[i].reason?.message||'Fonte indisponível'):null
 }));
}
async function persistCollected(batches,pool){
 const successful=batches.filter(b=>!b.error&&b.records.length>0);
 if(!successful.length)throw Error('Nenhuma fonte oficial devolveu registros nesta consulta.');
 const client=await pool.connect();
 try{
  await migrate(client);
  await client.query('BEGIN');
  const output=[];
  for(const batch of successful){
   const result=await saveMatters(client,batch.records);
   output.push({source:batch.source,processed:result.processed,revisions:result.revisions,invalid:result.invalid});
   await client.query(`INSERT INTO rl_sync_runs(source,started_at,finished_at,result,records_read,new_observations)
    VALUES($1,now(),now(),'completed',$2,$3)`,[batch.source,result.processed,result.revisions]);
  }
  for(const failed of batches.filter(b=>b.error)){
   await client.query(`INSERT INTO rl_sync_runs(source,started_at,finished_at,result,error_message)
    VALUES($1,now(),now(),'failed',$2)`,[failed.source,failed.error]);
  }
  await client.query('COMMIT');
  return output;
 }catch(e){
  await client.query('ROLLBACK');
  throw e;
 }finally{client.release();}
}
async function handler(req,res){
 if(req.method!=='GET')return reply(res,405,{error:'Método não permitido'});
 if(!isAuthorized(req.headers?.authorization,process.env.CRON_SECRET)){
  return reply(res,401,{error:'Não autorizado'});
 }
 if(!process.env.DATABASE_URL)return reply(res,503,{error:'Banco não configurado'});
 const pool=openPool();
 try{
  const batches=await collect();
  const imported=await persistCollected(batches,pool);
  console.log('Sincronização PostgreSQL',JSON.stringify({sources:imported,partial:batches.some(x=>x.error)}));
  return reply(res,200,{ok:true,imported,partial:batches.some(x=>x.error),at:new Date().toISOString()});
 }catch(e){
  console.error('Falha na sincronização SQL',String(e.message||e));
  return reply(res,503,{ok:false,error:'Falha na coleta ou persistência; registros anteriores preservados'});
 }finally{await pool.end();}
}
module.exports=handler;
module.exports.isAuthorized=isAuthorized;
module.exports.collect=collect;
module.exports.persistCollected=persistCollected;
