'use strict';

// Fail-closed: nenhum processo de importação deve tentar ocupar todo o plano gratuito.
// É um teto CONSERVADOR para um projeto Neon Free com 1 GB de armazenamento nominal.
// Outras ramificações do mesmo projeto podem consumir espaço adicional; o limite precisa
// ser monitorado também no painel do provedor. Isso NÃO configura cobrança automática.
const MiB=1024*1024;
const WARNING_BYTES=550*MiB;
const STOP_BYTES=700*MiB;

function interpretSize(value){
 const bytes=Number(value);
 if(!Number.isSafeInteger(bytes)||bytes<0)throw new Error('Medida de armazenamento inválida: importação interrompida por segurança');
 return bytes;
}
function assessStorage(used){
 const usedBytes=interpretSize(used);
 return {
  usedBytes,
  warningBytes:WARNING_BYTES,
  stopBytes:STOP_BYTES,
  warning:usedBytes>=WARNING_BYTES,
  blocked:usedBytes>=STOP_BYTES,
  usagePercentOfStop:Math.round(100*usedBytes/STOP_BYTES)
 };
}
async function storageStatus(client){
 const result=await client.query('SELECT pg_database_size(current_database())::bigint AS used_bytes');
 if(!result.rows?.length)throw new Error('Banco não retornou a utilização; importação suspensa');
 return assessStorage(result.rows[0].used_bytes);
}
async function guardWriteBudget(client){
 const status=await storageStatus(client);
 if(status.blocked){
  const error=new Error('Limite interno gratuito do PostgreSQL atingido (700 MiB). Importação suspensa; leitura dos dados preservada.');
  error.code='RADAR_FREE_STORAGE_LIMIT';
  error.storage=status;
  throw error;
 }
 if(status.warning)console.warn('Aviso: armazenamento PostgreSQL acima de 550 MiB. Priorizar compactação antes de novo backfill.');
 return status;
}
module.exports={MiB,WARNING_BYTES,STOP_BYTES,interpretSize,assessStorage,storageStatus,guardWriteBudget};
