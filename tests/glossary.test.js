'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const gloss=require('../glossary');
const {camaraAuthors,senadoAuthors}=require('../api/_lib/autoria');
test('PL deve mostrar nome completo e explicação',()=>{
 assert.equal(gloss.find('PL').nome,'Projeto de Lei');
 assert.match(gloss.find('PEC').descricao,/Constituição/);
 assert.ok(gloss.search('lei complementar').some(item=>item.id==='PLP'));
});
test('pesquisa do glossário ignora maiúsculas e acentos',()=>{
 assert.ok(gloss.search('votacao nominal').some(item=>item.id==='Votação nominal'));
 assert.ok(gloss.search('sanção').some(item=>item.id==='Sanção'));
});
test('autoria Câmara preserva nomes únicos sem inventar registros',()=>{
 assert.deepEqual(camaraAuthors({dados:[{nome:'Maria Silva',tipo:'Deputado',siglaPartido:'ABC',siglaUf:'SC'},{nome:'Maria Silva'},{nome:'João Souza'}]}).map(x=>x.nome),['Maria Silva','João Souza']);
 assert.deepEqual(camaraAuthors({dados:[]}),[]);
});
test('autoria Senado usa dados de autoria, sem inferir relatoria',()=>{
 const data={AutoriaMateria:{Autores:[{Autor:{NomeAutor:'Joana Souza',IdentificacaoParlamentar:{NomeParlamentar:'Joana Souza'}}},{Autor:{NomeAutor:'Paulo Lima'}}]}};
 const result=senadoAuthors(data);
 assert.deepEqual(result.map(x=>x.nome).sort(),['Joana Souza','Paulo Lima']);
 assert.deepEqual(senadoAuthors({Relatoria:{NomeRelator:'Joana Souza'}}),[]);
});
