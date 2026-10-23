'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {loadDay}=require('../api/_lib/daily');

function comparable(obj){
 const clone={...obj}; delete clone.consultadoEm;
 return JSON.stringify(clone);
}
function writeSnapshot(filename,data){
 if(fs.existsSync(filename)){
  const current=JSON.parse(fs.readFileSync(filename,'utf8'));
  if(comparable(current)===comparable(data))return false;
 }
 fs.mkdirSync(path.dirname(filename),{recursive:true});
 fs.writeFileSync(filename,JSON.stringify(data,null,2)+'\n');
 return true;
}
async function collect({instant=new Date(),get}={}){
 const data=await loadDay({instant,get});
 const name=path.resolve(__dirname,'../data/today.json');
 const changed=writeSnapshot(name,data);
 console.log(JSON.stringify({dia:data.dia,fonte:data.fontesConsultadas,materias:data.materias.length,votacoes:data.votacoes.length,eventos:data.eventos.length,partial:data.falhas.length>0,changed}));
 return data;
}
if(require.main===module)collect().catch(e=>{console.error(e.message);process.exitCode=1});
module.exports={collect,writeSnapshot,comparable};
