'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {CAMARA,getJson}=require('../api/_lib/client');
const {openPool,migrate,saveMatters,saveMovements,saveVotings}=require('../database/client');
function read(relative){
 return JSON.parse(fs.readFileSync(path.join(__dirname,'..',relative),'utf8'));
}
async function ingest(){
 if(!process.env.DATABASE_URL){console.log('DATABASE_URL ausente; persistência SQL não ativada. Amostras estáticas permanecem disponíveis.');return;}
 const pool=openPool();
 try{
  const client=await pool.connect();
  let summary;
  try{
   await migrate(client);
   const snapshot=read('data/latest.json');
   if(!Array.isArray(snapshot.materias)||snapshot.materias.length<10)throw Error('Snapshot oficial insuficiente');
   await client.query('BEGIN');
   try{
    summary=await saveMatters(client,snapshot.materias);
    const voting=read('data/votacoes.json');
    summary.votings=await saveVotings(client,voting.votacoes||[]);
    await client.query('COMMIT');
   }catch(e){await client.query('ROLLBACK');throw e;}
   // Só consulta atos em lote limitado. Cada execução é idempotente e permite
   // continuar de onde parou, sem pressupor que todos os atos já foram coletados.
   let loaded=0;
   const max=Math.max(0,Math.min(Number(process.env.MOVEMENTS_PER_RUN||'18')||0,100));
   const active=snapshot.materias.filter(m=>m.origem==='camara');
   for(const m of active.slice(0,max)){
    try{
     const j=await getJson(CAMARA+'/proposicoes/'+m.id+'/tramitacoes?itens=100');
     const rows=j.dados||[];
     await client.query('BEGIN');
     try{
      loaded+=await saveMovements(client,'camara',m.id,rows);
      await client.query('COMMIT');
     }catch(e){await client.query('ROLLBACK');throw e;}
    }catch(e){console.warn('Tramitação '+m.id+' indisponível: '+e.message);}
   }
   summary.newMovements=loaded;
   console.log(JSON.stringify({importacao:'completa',...summary}));
  }finally{client.release();}
 }finally{await pool.end();}
}
if(require.main===module)ingest().catch(e=>{console.error('Importação SQL interrompida:',e.message);process.exitCode=1});
module.exports={ingest};
