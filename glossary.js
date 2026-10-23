'use strict';
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.RadarGlossary=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
  const SOURCE='https://www.congressonacional.leg.br/legislacao-e-publicacoes/glossario-legislativo';
  const TYPES=[
    ['PL','Projeto de Lei','Proposta de criação ou alteração de lei ordinária federal. Sua apresentação não significa que tenha sido aprovada.'],
    ['PLP','Projeto de Lei Complementar','Projeto de lei destinado a matéria que a Constituição reserva à lei complementar.'],
    ['PEC','Proposta de Emenda à Constituição','Proposta para modificar o texto da Constituição Federal.'],
    ['MPV','Medida Provisória','Ato normativo editado pelo Presidente da República com força de lei e submetido à apreciação do Congresso.'],
    ['PLV','Projeto de Lei de Conversão','Texto apresentado durante a análise de uma medida provisória quando há alterações propostas em seu conteúdo.'],
    ['PLN','Projeto de Lei do Congresso Nacional','Projeto de matéria orçamentária apreciado pelo Congresso Nacional.'],
    ['PDL','Projeto de Decreto Legislativo','Proposição destinada à edição de decreto legislativo em matérias de competência do Legislativo.'],
    ['PDC','Projeto de Decreto Legislativo (Câmara)','Sigla usada pela Câmara para projeto de decreto legislativo em determinados registros.'],
    ['PDS','Projeto de Decreto Legislativo (Senado)','Sigla usada pelo Senado para projeto de decreto legislativo em determinados registros.'],
    ['PRC','Projeto de Resolução da Câmara dos Deputados','Proposição referente a matérias de competência interna da Câmara.'],
    ['PRS','Projeto de Resolução do Senado Federal','Proposição de resolução de competência do Senado Federal.'],
    ['PRN','Projeto de Resolução do Congresso Nacional','Proposição destinada a resolução de competência do Congresso Nacional.'],
    ['VET','Veto Presidencial','Registro do veto total ou parcial do Presidente da República a projeto aprovado pelo Legislativo.'],
    ['REQ','Requerimento','Solicitação formal apresentada no âmbito do processo legislativo.'],
    ['RIC','Requerimento de Informação','Pedido formal de informações no exercício da fiscalização parlamentar.'],
    ['RCP','Requerimento de Instituição de CPI','Pedido formal relacionado à criação de Comissão Parlamentar de Inquérito.'],
    ['MSC','Mensagem','Comunicação oficial de uma autoridade ao órgão legislativo.'],
    ['INC','Indicação','Proposição por meio da qual se sugere a outro órgão a adoção de providências.'],
    ['PFC','Proposta de Fiscalização e Controle','Proposição destinada à fiscalização e controle de atos da administração pública.'],
    ['PFS','Proposta de Fiscalização e Controle (Senado)','Proposta de fiscalização e controle no Senado Federal.'],
    ['PLS','Projeto de Lei do Senado','Identificação histórica de projetos de lei originados no Senado; a sigla PL é usada em registros mais recentes.'],
    ['PLC','Projeto de Lei da Câmara','Identificação histórica de projetos de lei originados na Câmara e recebidos pelo Senado.'],
    ['SBT','Substitutivo','Proposta de texto para substituir, integral ou substancialmente, outro texto em análise.'],
    ['EMC','Emenda de Comissão','Proposta de alteração de um texto legislativo no âmbito de comissão.'],
    ['RQS','Requerimento do Senado','Espécie de requerimento registrado no Senado Federal.'],
    ['PAR','Parecer','Manifestação técnica ou política formal sobre matéria em análise, antes ou durante sua deliberação.']
  ];
  const TERMS=[
    ['Ementa','Resumo oficial do assunto tratado pela proposição, não necessariamente descrição de todos os seus efeitos.'],
    ['Autoria','Identificação da pessoa, órgão ou entidade que apresentou ou subscreveu a matéria, conforme o registro oficial.'],
    ['Tramitação','Sequência de atos e etapas por que passa uma matéria legislativa.'],
    ['Relator','Parlamentar designado para analisar uma matéria e apresentar relatório ou parecer.'],
    ['Parecer','Manifestação formal de relator ou comissão sobre uma proposta.'],
    ['Emenda','Proposta de alteração de parte do texto em análise.'],
    ['Substitutivo','Texto alternativo apresentado para substituir outro texto em análise.'],
    ['Apensamento','Tramitação conjunta de matérias relacionadas conforme regras regimentais.'],
    ['Comissão','Órgão colegiado que analisa, debate ou delibera matérias conforme sua competência.'],
    ['Plenário','Colegiado de parlamentares de uma Casa legislativa reunido para trabalhos e deliberações.'],
    ['Pauta','Relação de assuntos ou matérias previstos para determinada sessão ou reunião.'],
    ['Votação nominal','Votação com registro individualizado dos votos dos parlamentares, quando disponível.'],
    ['Votação simbólica','Processo de votação cujo resultado não identifica individualmente o voto de cada parlamentar.'],
    ['Sanção','Ato do Presidente da República que concorda com projeto de lei aprovado pelo Congresso, total ou parcialmente.'],
    ['Veto','Recusa total ou parcial de sanção presidencial a projeto aprovado pelo Congresso, sujeita à apreciação legislativa.'],
    ['Promulgação','Ato formal que atesta a existência de norma jurídica e ordena sua observância.'],
    ['Arquivamento','Encerramento administrativo da tramitação em uma hipótese regimental; não equivale necessariamente a rejeição em votação.'],
    ['Urgência','Regime ou procedimento que pode acelerar a tramitação ou a apreciação de uma matéria segundo regras específicas.']
  ];
  const entries=[
    ...TYPES.map(([sigla,nome,descricao])=>({id:sigla,nome,descricao,categoria:'Siglas de matérias',fonte:SOURCE})),
    ...TERMS.map(([nome,descricao])=>({id:nome,nome,descricao,categoria:'Termos legislativos',fonte:SOURCE}))
  ];
  const byId=new Map(entries.map(e=>[e.id.toLocaleUpperCase('pt-BR'),e]));
  function find(term){return byId.get(String(term||'').trim().toLocaleUpperCase('pt-BR'))||null}
  function plain(text){return String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR')}
  function search(term){const query=plain(term).trim();return entries.filter(e=>!query||plain(e.id+' '+e.nome+' '+e.descricao).includes(query))}
  return {entries,find,search,source:SOURCE};
});
