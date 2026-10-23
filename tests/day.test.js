'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {todayKey,dateKey,onlyToday,trimDaily}=require('../day');
test('Brazilian calendar changes at Brasília midnight, not UTC midnight',()=>{
 assert.equal(todayKey(new Date('2026-10-24T02:59:00Z')),'2026-10-23');
 assert.equal(todayKey(new Date('2026-10-24T03:00:00Z')),'2026-10-24');
});
test('official naive datetimes remain local while UTC timestamp is converted',()=>{
 assert.equal(dateKey('2026-10-23T22:30'),'2026-10-23');
 assert.equal(dateKey('2026-10-24T02:30:00Z'),'2026-10-23');
 assert.equal(dateKey('23/10/2026'),'2026-10-23');
 assert.equal(dateKey('not a date'),null);
});
test('today filter never includes yesterday or events planned tomorrow',()=>{
 const p={materias:[{data:'2026-10-23'},{data:'2026-10-22'}],
  votacoes:[{data:'2026-10-24T02:30:00Z'},{data:'2026-10-24T04:00:00Z'}],
  eventos:[{data:'2026-10-23T11:00'},{data:'2026-10-24T11:00'}]};
 const r=trimDaily(p,'2026-10-23');
 assert.equal(r.materias.length,1);
 assert.equal(r.votacoes.length,1);
 assert.equal(r.eventos.length,1);
});
