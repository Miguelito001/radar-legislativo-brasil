'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {MiB,assessStorage,guardWriteBudget}=require('../database/budget');
test('free budget permits ingest far from the storage threshold',async()=>{
 const status=await guardWriteBudget({query:async()=>({rows:[{used_bytes:String(125*MiB)}]})});
 assert.equal(status.blocked,false);
 assert.equal(status.warning,false);
});
test('free budget stops all writes at 700 MiB, without requiring paid resources',async()=>{
 const client={query:async()=>({rows:[{used_bytes:String(700*MiB)}]})};
 await assert.rejects(guardWriteBudget(client),e=>e.code==='RADAR_FREE_STORAGE_LIMIT'&&e.storage.blocked===true);
 assert.equal(assessStorage(700*MiB).usagePercentOfStop,100);
});
test('free budget refuses malformed storage readings',async()=>{
 await assert.rejects(guardWriteBudget({query:async()=>({rows:[{used_bytes:'NaN'}]})}),/inválida/);
 await assert.rejects(guardWriteBudget({query:async()=>({rows:[]})}),/não retornou/);
});
test('free budget warns at 550 MiB while not blocking reads or normal write traffic',()=>{
 assert.equal(assessStorage(550*MiB).warning,true);
 assert.equal(assessStorage(550*MiB).blocked,false);
 assert.equal(assessStorage(701*MiB).blocked,true);
});
