'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {nextCursor}=require('../scripts/backfill-camara');
test('retoma a página seguinte após importar registros',()=>{
 assert.deepEqual(nextCursor({ano:2026,pagina:5},true,2023),{ano:2026,pagina:6,terminado:false});
});
test('retrocede exatamente um ano no final da paginação',()=>{
 assert.deepEqual(nextCursor({ano:2026,pagina:33},false,2023),{ano:2025,pagina:1,terminado:false});
});
test('encerra no limite histórico sem reiniciar silenciosamente',()=>{
 assert.deepEqual(nextCursor({ano:2023,pagina:56},false,2023),{ano:2023,pagina:56,terminado:true});
});
