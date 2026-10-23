'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'public');
const assets=['index.html','styles.css','app.js','glossary.js','data/latest.json','data/votacoes.json','data/agenda.json'];
fs.mkdirSync(out,{recursive:true});
for(const name of assets){
 const source=path.join(root,name),destination=path.join(out,name);
 if(!fs.existsSync(source))throw Error('Required asset unavailable: '+name);
 fs.mkdirSync(path.dirname(destination),{recursive:true});
 fs.copyFileSync(source,destination);
}
console.log('Static assets prepared:',assets.length);
