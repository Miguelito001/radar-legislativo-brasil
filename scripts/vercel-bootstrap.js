'use strict';
// Runs only while building a production deployment. Preview deployments never write to production.
if(process.env.VERCEL_ENV!=='production'){
  console.log('PostgreSQL bootstrap skipped outside production.');
}else if(!process.env.DATABASE_URL){
  console.log('PostgreSQL bootstrap skipped: DATABASE_URL missing; static source snapshots remain available.');
}else{
  console.log('Bootstrapping official records into configured PostgreSQL...');
  process.env.MOVEMENTS_PER_RUN='0';
  require('./ingest.js');
}
