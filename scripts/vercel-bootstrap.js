'use strict';
async function main(){
 if(process.env.VERCEL_ENV!=='production'){
  console.log('PostgreSQL bootstrap skipped outside production.');
  return;
 }
 if(!process.env.DATABASE_URL){
  console.log('PostgreSQL bootstrap skipped: database not connected.');
  return;
 }
 const {openPool,migrate}=require('../database/client');
 const pool=openPool();
 let populated=false;
 try{
  const client=await pool.connect();
  try{
   await migrate(client);
   const check=await client.query('SELECT 1 FROM rl_matters LIMIT 1');
   populated=check.rows.length>0;
  }finally{client.release();}
 }finally{await pool.end();}
 if(populated){
  console.log('PostgreSQL contains official matters; preserving existing state.');
  return;
 }
 console.log('First-time initialization from source-verified snapshot.');
 process.env.MOVEMENTS_PER_RUN='0';
 await require('./ingest.js').ingest();
}
main().catch(e=>{console.error('Database initialization failed:',e.message);process.exitCode=1});
