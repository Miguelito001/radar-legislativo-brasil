'use strict';
const {send}=require('./_lib/client');
const {todayKey}=require('../day');
module.exports=function(req,res){
 if(req.method!=='GET')return send(res,405,{error:'Método não permitido'});
 return send(res,200,{state:'daily_only',day:todayKey(),database:'not_used',
  note:'O Radar do Dia usa apenas consultas oficiais e captura estática de hoje. Nenhuma consulta ao PostgreSQL é efetuada por esta rota.'});
};
