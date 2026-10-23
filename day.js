'use strict';
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.RadarDay=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
 const ZONE='America/Sao_Paulo';
 const formatter=new Intl.DateTimeFormat('en-US',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'});
 function todayKey(instant=new Date()){
  const parts=Object.fromEntries(formatter.formatToParts(instant).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  return parts.year+'-'+parts.month+'-'+parts.day;
 }
 function dateKey(value){
  if(value===undefined||value===null||value==='')return null;
  const source=String(value).trim();
  const br=/^(\d{2})\/(\d{2})\/(\d{4})/.exec(source);
  if(br)return br[3]+'-'+br[2]+'-'+br[1];
  const match=/^(\d{4}-\d{2}-\d{2})(?:[ T](.*))?$/.exec(source);
  if(match){
   const remainder=match[2]||'';
   if(!remainder||!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(remainder))return match[1];
  }
  const date=new Date(source);
  return Number.isFinite(date.getTime())?todayKey(date):null;
 }
 function isToday(value,day=todayKey()){return dateKey(value)===day}
 function onlyToday(items,day=todayKey(),field='data'){
  return (Array.isArray(items)?items:[]).filter(x=>x&&isToday(x[field],day));
 }
 function trimDaily(data,day=todayKey()){
  return {
   ...data,
   dia:day,
   materias:onlyToday(data?.materias,day),
   votacoes:onlyToday(data?.votacoes,day),
   eventos:onlyToday(data?.eventos,day)
  };
 }
 return {ZONE,todayKey,dateKey,isToday,onlyToday,trimDaily};
});
