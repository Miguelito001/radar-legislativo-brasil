'use strict';
(function(){
const paths={grid:'M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z',files:'M7 3h9l5 5v13H7zM16 3v5h5M3 7v14',vote:'M5 9h14l2 12H3L5 9zM8 13h8M12 3v7',calendar:'M3 6h18v15H3zM7 3v6M17 3v6M3 11h18',database:'M12 3c5 0 9 2 9 4s-4 4-9 4-9-2-9-4 4-4 9-4zM3 7v10c0 2 4 4 9 4s9-2 9-4V7M3 12c0 2 4 4 9 4s9-2 9-4',external:'M13 3h8v8M21 3l-11 11M20 14v7H3V4h7',arrow:'M4 12h16m-7-7 7 7-7 7',refresh:'M20 7V3l-4 4h4a8 8 0 1 0 2 7',info:'M12 16v-4M12 8h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',building:'M3 10h18M6 10v9m6-9v9m6-9v9M2 21h20M12 2 2 8h20L12 2z',clock:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20M12 6v6l4 2',search:'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16m6-2 5 5','chevron-left':'m15 18-6-6 6-6','chevron-right':'m9 18 6-6-6-6',shield:'M12 2 3 6v6c0 6 4 9 9 10 5-1 9-4 9-10V6L12 2zM8 12l3 3 5-6',menu:'M4 6h16M4 12h16M4 18h16',book:'M3 4h8a3 3 0 0 1 3 3v14H6a3 3 0 0 0-3 1V4zm18 0h-7a3 3 0 0 0-3 3v14h7a3 3 0 0 1 3 1V4z',close:'M5 5l14 14M19 5 5 19'};
const svg=(name)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.info}"/></svg>`;
const esc=(x)=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const $=sel=>document.querySelector(sel), $$=sel=>Array.from(document.querySelectorAll(sel));
const glossary=globalThis.RadarGlossary;
const state={page:'radar',source:'todas',type:'',year:'',q:'',number:'',pagina:1,loading:false,materias:[],fontes:[],falhas:[],last:null,votesLoaded:false,agendaLoaded:false,requestSeq:0,rawSnapshot:[],snapshotUsed:false,total:0,totals:{camara:0,senado:0}};
function date(v){if(!v)return 'Data não informada';const iso=/^\d{4}-\d{2}-\d{2}$/.test(v)?v+'T12:00:00':v;const d=new Date(iso);return isNaN(d)?String(v).slice(0,10):new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).format(d)}
function time(v){if(!v)return '—';const d=new Date(v);return isNaN(d)?'—':new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}).format(d)}
function official(p){return p.origem==='camara'?`https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${encodeURIComponent(p.id)}`:`https://www25.senado.leg.br/web/atividade/materias/-/materia/${encodeURIComponent(p.id)}`}
function empty(title,desc,error=false){return `<div class="empty-state"><div>${svg(error?'info':'search')}</div><h3>${esc(title)}</h3><p>${esc(desc)}</p>${error?'<button class="quiet-btn" data-retry="1" type="button">Tentar novamente</button>':''}</div>`}
function card(p){
 const name=`${p.tipo||'MATÉRIA'} ${p.numero||'—'}/${p.ano||'—'}`;
 const typeName=glossary.find(p.tipo)?.nome||'Tipo conforme registro oficial';
 return `<article class="matter-card">
  <div class="matter-top"><div class="tags">${termBadge(p.tipo)}<span class="source-tag">${esc(p.casa)}</span><span class="matter-id">${esc(name)}</span></div><span class="matter-date">${esc(date(p.data))}</span></div>
  <div class="matter-full-type">${esc(typeName)}</div>
  <p class="matter-title">${esc(p.ementa||'Ementa não retornada pela fonte nesta consulta.')}</p>
  <div class="matter-context"><div><span>Autoria</span><strong class="author-pending" data-author-key="${esc(p.key)}">Consultando registro oficial…</strong></div>${p.situacao?`<div><span>Situação</span><strong>${esc(p.situacao)}</strong></div>`:''}</div>
  <div class="matter-foot"><span class="record-origin">Origem: <strong>${esc(p.casa)}</strong> · ID oficial: ${esc(p.id)}</span><div class="matter-actions"><button type="button" data-detail="${esc(p.key)}">Detalhes ${svg('chevron-right')}</button><a href="${esc(official(p))}" target="_blank" rel="noopener noreferrer">Fonte oficial ${svg('external')}</a></div></div>
 </article>`;
}

function termBadge(code){
 const sigla=String(code||'').trim().toUpperCase();
 const term=glossary.find(sigla);
 if(!term)return '<span class="type-tag">'+esc(sigla||'SEM TIPO')+'</span>';
 return '<button type="button" class="type-tag term-trigger" data-term="'+esc(sigla)+'" title="'+esc(term.nome)+' — '+esc(term.descricao)+'" aria-label="'+esc(sigla+': '+term.nome)+'">'+esc(sigla)+' <span class="term-mark" aria-hidden="true">?</span></button>';
}
const authorCache=new Map(),authorQueue=[],queuedAuthors=new Set();
let authorsRunning=0;
const authorObserver=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
 for(const item of entries)if(item.isIntersecting){authorObserver.unobserve(item.target);queueAuthor(item.target.dataset.authorKey)}
},{rootMargin:'240px 0px'}):null;
function authorText(result){
 if(result?.error)return 'Autoria não disponível nesta consulta';
 const list=Array.isArray(result?.autores)?result.autores.filter(a=>a?.nome):[];
 if(!list.length)return 'Autoria não informada no retorno oficial';
 const labels=list.slice(0,3).map(a=>a.nome);
 return labels.join(', ')+(list.length>3?' e mais '+(list.length-3)+' autor(es)':'');
}
function paintAuthors(key){
 const result=authorCache.get(key);
 if(!result)return;
 for(const el of $('[data-author-key]'))if(el.dataset.authorKey===key){
  el.textContent=authorText(result);
  el.title=result.autores?.length>3?result.autores.map(a=>a.nome).join(', '):'';
  el.classList.remove('author-pending');
 }
}
function queueAuthor(key){
 if(!/^(camara|senado):\d{1,12}$/.test(key||''))return;
 if(authorCache.has(key)){paintAuthors(key);return}
 if(queuedAuthors.has(key))return;
 queuedAuthors.add(key);authorQueue.push(key);drainAuthors();
}
function drainAuthors(){
 while(authorsRunning<3&&authorQueue.length){
  const key=authorQueue.shift();authorsRunning++;
  const [origem,id]=key.split(':');
  request('/api/autores?origem='+encodeURIComponent(origem)+'&id='+encodeURIComponent(id))
    .then(data=>authorCache.set(key,{autores:data.autores||[]}))
    .catch(()=>authorCache.set(key,{error:true}))
    .finally(()=>{authorsRunning--;queuedAuthors.delete(key);paintAuthors(key);drainAuthors()});
 }
}
function hydrateAuthors(){
 for(const el of $('[data-author-key]')){
  const key=el.dataset.authorKey;
  if(authorCache.has(key)){paintAuthors(key);continue}
  if(authorObserver)authorObserver.observe(el);else queueAuthor(key);
 }
}
function renderGlossary(){
 const input=$('#glossary-search');if(!input)return;
 const matches=glossary.search(input.value);
 $('#glossary-count').textContent=matches.length+' verbetes encontrados';
 const groups=['Siglas de matérias','Termos legislativos'];
 $('#glossary-results').innerHTML=groups.map(group=>{
  const items=matches.filter(item=>item.categoria===group);
  if(!items.length)return '';
  return '<section class="glossary-section"><h3>'+esc(group)+'</h3><div class="glossary-grid">'+items.map(item=>'<article class="glossary-card"><div class="glossary-card-head">'+(item.categoria==='Siglas de matérias'?'<span class="glossary-code">'+esc(item.id)+'</span>':'<span class="glossary-dot"></span>')+'<strong>'+esc(item.nome)+'</strong></div><p>'+esc(item.descricao)+'</p><a href="'+esc(item.fonte)+'" target="_blank" rel="noopener noreferrer">Referência oficial '+svg('external')+'</a></article>').join('')+'</div></section>';
 }).join('')||empty('Nenhum termo encontrado','Experimente pesquisar por outra sigla ou expressão.');
}
const termPopover=$('#term-popover');
let activeTerm=null,termHideTimer=null;
function hideTerm(){
 if(termHideTimer){clearTimeout(termHideTimer);termHideTimer=null}
 if(activeTerm){activeTerm.removeAttribute('aria-describedby');activeTerm=null}
 termPopover.hidden=true;
}
function showTerm(trigger){
 const item=glossary.find(trigger.dataset.term);
 if(!item)return;
 if(termHideTimer){clearTimeout(termHideTimer);termHideTimer=null}
 if(activeTerm&&activeTerm!==trigger)activeTerm.removeAttribute('aria-describedby');
 activeTerm=trigger;trigger.setAttribute('aria-describedby','term-popover');
 termPopover.innerHTML='<div class="term-popover-top"><span>'+esc(item.id)+'</span><strong>'+esc(item.nome)+'</strong></div><p>'+esc(item.descricao)+'</p>';
 termPopover.hidden=false;
 const rect=trigger.getBoundingClientRect();
 const width=termPopover.offsetWidth,height=termPopover.offsetHeight;
 const left=Math.max(10,Math.min(rect.left,window.innerWidth-width-10));
 const top=rect.bottom+9+height>window.innerHeight&&rect.top>height+9?rect.top-height-9:rect.bottom+9;
 termPopover.style.left=left+'px';termPopover.style.top=Math.max(10,top)+'px';
}
function scheduleTermHide(){if(termHideTimer)clearTimeout(termHideTimer);termHideTimer=setTimeout(hideTerm,220)}
document.addEventListener('pointerover',e=>{const term=e.target.closest('[data-term]');if(term)showTerm(term);else if(e.target.closest('#term-popover')&&termHideTimer)clearTimeout(termHideTimer)});
document.addEventListener('pointerout',e=>{const term=e.target.closest('[data-term]');if(term&&!term.contains(e.relatedTarget)&&!termPopover.contains(e.relatedTarget))scheduleTermHide();else if(e.target.closest('#term-popover')&&!termPopover.contains(e.relatedTarget)&&(!activeTerm||!activeTerm.contains(e.relatedTarget)))scheduleTermHide()});
document.addEventListener('focusin',e=>{const term=e.target.closest('[data-term]');if(term)showTerm(term)});
document.addEventListener('focusout',e=>{if(e.target.closest('[data-term]'))scheduleTermHide()});
window.addEventListener('scroll',hideTerm,true);

function setPage(page){if(!['radar','materias','votacoes','agenda','glossario','fontes'].includes(page))return;state.page=page;$$('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+page));$$('[data-page]').forEach(b=>b.classList.toggle('active',b.classList.contains('nav-link')&&b.dataset.page===page));const names={radar:'Visão geral',materias:'Matérias legislativas',votacoes:'Votações',agenda:'Agenda',glossario:'Glossário legislativo',fontes:'Fontes e metodologia'};$('#crumb').textContent=names[page];$('#hero').style.display=page==='radar'?'flex':'none';$('#sidebar').classList.remove('open');$('#mobile-overlay').classList.remove('visible');window.scrollTo({top:0,behavior:'smooth'});if(page==='votacoes'&&!state.votesLoaded)loadVotes();if(page==='agenda'&&!state.agendaLoaded)loadAgenda();if(page==='materias'&&!state.materias.length)loadMatters();if(page==='glossario')renderGlossary();hideTerm();}
async function request(path){const controller=new AbortController();const t=setTimeout(()=>controller.abort(),17000);try{const r=await fetch(path,{signal:controller.signal});let j;try{j=await r.json()}catch{throw Error('Resposta inválida do servidor')};if(!r.ok)throw Error(j.error||`Erro HTTP ${r.status}`);return j}finally{clearTimeout(t)}}
function filterRows(rows){
 let filtered=Array.isArray(rows)?rows.filter(x=>x&&x.key&&x.id):[];
 if(state.source!=='todas')filtered=filtered.filter(x=>x.origem===state.source);
 if(state.type)filtered=filtered.filter(x=>x.tipo===state.type);
 if(state.year)filtered=filtered.filter(x=>String(x.ano)===state.year);
 const q=state.q.toLocaleLowerCase('pt-BR');
 if(q)filtered=filtered.filter(x=>[x.tipo,x.numero,x.ano,x.ementa,x.situacao,x.casa].some(v=>String(v||'').toLocaleLowerCase('pt-BR').includes(q)));
 return filtered.sort((a,b)=>String(b.data||'').localeCompare(String(a.data||'')));
}
function applyRows(rows,{snapshot=false,at=null,fontes=[],falhas=[]}={}){
 const filtered=filterRows(rows);
 state.total=filtered.length;
 state.totals={camara:filtered.filter(x=>x.origem==='camara').length,senado:filtered.filter(x=>x.origem==='senado').length};
 state.materias=filtered.slice((state.pagina-1)*50,state.pagina*50);
 state.snapshotUsed=snapshot;state.last=at;state.fontes=fontes;state.falhas=falhas;
 renderMatters();
}
async function loadMatters(){
 const seq=++state.requestSeq;
 $('#matter-results').innerHTML=empty('Buscando registros oficiais','Carregando a última amostra validada das fontes.');
 $('#radar-results').innerHTML=empty('Buscando registros oficiais','Carregando dados documentados do Legislativo.');
 $('#results-summary').textContent='Carregando informações...';
 const params=new URLSearchParams({fonte:state.source,pagina:String(state.pagina)});
 if(state.type)params.set('tipo',state.type);if(state.year)params.set('ano',state.year);if(state.q)params.set('q',state.q);
 let hasData=false;
 try{
  const j=await request('/data/latest.json?v='+Math.floor(Date.now()/120000));
  if(seq!==state.requestSeq)return;
  if(Array.isArray(j.materias)&&j.materias.length){
   state.rawSnapshot=j.materias;
   applyRows(j.materias,{snapshot:true,at:j.consultadoEm,fontes:j.fontes||[],falhas:j.falhas||[]});
   hasData=true;
  }
 }catch(e){ console.warn('Amostra oficial indisponível; usando consulta direta:',e?.message||e); }
 try{
  const live=await request('/api/materias?'+params.toString());
  if(seq!==state.requestSeq)return;
  const dynamic=Array.isArray(live.materias)?live.materias:[];
  if(!dynamic.length&&!hasData)throw Error('As APIs responderam sem registros neste lote.');
  const merged=new Map((hasData?state.rawSnapshot:[]).map(p=>[p.key,p]));
  for(const p of dynamic)if(p?.key)merged.set(p.key,p);
  applyRows([...merged.values()],{snapshot:hasData,at:live.consultadoEm||state.last,fontes:[...new Set([...(hasData?state.fontes:[]),...(live.fontes||[])])],falhas:live.falhas||[]});
  hasData=true;
 }catch(e){
  if(seq!==state.requestSeq)return;
  if(hasData){
   state.falhas=[...state.falhas,'A consulta direta não respondeu; exibindo somente a amostra oficial previamente sincronizada.'];
   renderMatters();
  }else{
   state.materias=[];state.total=0;state.totals={camara:0,senado:0};
   $('#radar-results').innerHTML=empty('Fontes temporariamente indisponíveis','Não há amostra válida disponível nesta implantação.',true);
   $('#matter-results').innerHTML=empty('Consulta indisponível',e.message||'Não foi possível obter registros',true);
   $('#results-summary').textContent='Nenhuma fonte disponível';
   $('#count-matters').textContent=$('#count-camara').textContent=$('#count-senado').textContent=$('#count-update').textContent='—';
   $('#sidebar-sync').textContent='Consulta indisponível';
  }
 }
}
function renderMatters(){
 const list=state.materias;
 const html=list.map(card).join('');
 $('#matter-results').innerHTML=html||empty('Nenhum registro encontrado nesta amostra','Experimente mudar os filtros. A pesquisa ainda não cobre o acervo histórico completo.');
 $('#radar-results').innerHTML=list.slice(0,5).map(card).join('')||empty('Nenhum registro neste filtro','A pesquisa atual não encontrou matérias na amostra.');
 const label=state.snapshotUsed?'Amostra oficial sincronizada + consultas disponíveis':'Resultado de consulta direta';
 $('#results-summary').textContent=state.total.toLocaleString('pt-BR')+' registros no conjunto consultado · '+label+(state.falhas.length?' · atenção: consulta parcial':'');
 $('#count-matters').textContent=state.total.toLocaleString('pt-BR');
 $('#count-camara').textContent=state.totals.camara.toLocaleString('pt-BR');
 $('#count-senado').textContent=state.totals.senado.toLocaleString('pt-BR');
 $('#count-update').textContent=time(state.last);
 $('#sidebar-sync').textContent=(state.falhas.length?'Amostra disponível · ':'Consultado às ')+time(state.last);
 $('#page-indicator').textContent='Página '+state.pagina;
 $('#prev-page').disabled=state.pagina<=1;
 $('#next-page').disabled=state.pagina*50>=state.total;
 hydrateAuthors();
}
async function detail(key){const p=state.materias.find(x=>x.key===key);if(!p)return;$('#drawer-scrim').hidden=false;$('#drawer').classList.add('open');$('#drawer').setAttribute('aria-hidden','false');$('#drawer-content').innerHTML=empty('Carregando histórico','Consultando os registros detalhados na fonte oficial.');try{const j=await request(`/api/materia?origem=${encodeURIComponent(p.origem)}&id=${encodeURIComponent(p.id)}`);const m=j.materia||p;const tr=j.tramitacoes||[];const vs=j.votacoes||[];$('#drawer-content').innerHTML=`<div class="tags">${termBadge(m.tipo)}<span class="source-tag">${esc(m.casa)}</span></div><h2 id="drawer-title">${esc(m.tipo)} ${esc(m.numero)}/${esc(m.ano)}</h2><p class="drawer-type-name">${esc(glossary.find(m.tipo)?.nome||"Tipo segundo a fonte oficial")}</p><p>${esc(m.ementa||'Ementa não publicada no resultado.')}</p><div class="drawer-meta"><div><small>Data de apresentação</small><strong>${esc(date(m.data))}</strong></div><div><small>Situação oficial</small><strong>${esc(j.detalhes?.situacao||'Consultar a fonte')}</strong></div><div><small>Identificador da fonte</small><strong>${esc(m.id)}</strong></div><div><small>Consulta realizada</small><strong>${esc(time(j.consultadoEm))}</strong></div></div><div class="detail-authors"><h3>Autoria registrada</h3><p class="author-pending" data-author-key="${esc(m.key||p.key)}">Consultando registro oficial…</p></div><a class="official-link" href="${esc(official(m))}" target="_blank" rel="noopener noreferrer">Abrir ficha oficial ${svg('external')}</a><h3>Tramitações retornadas (${tr.length})</h3>${tr.length?`<div class="drawer-events">${tr.map(t=>`<div class="drawer-event"><time>${esc(date(t.data))}</time><p>${esc(t.descricao||t.despacho||'Ato registrado')}</p><small>${esc(t.orgao||'')}</small></div>`).join('')}</div>`:'<p>Histórico detalhado não disponível nesta consulta. A ficha oficial pode conter dados adicionais.</p>'}<h3>Votações vinculadas (${vs.length})</h3>${vs.length?vs.map(v=>`<div class="drawer-event"><time>${esc(date(v.data))}</time><p>${esc(v.descricao)}</p><small>${esc(v.resultado||'')}</small></div>`).join(''):'<p>Nenhuma votação foi retornada nesta consulta. Isso não comprova ausência de deliberações.</p>'}${(j.avisos||[]).map(a=>`<p class="error-small">${esc(a)}</p>`).join('')}`;
 hydrateAuthors();
 }catch(e){$('#drawer-content').innerHTML=empty('Detalhes indisponíveis',e.message||'Fonte não respondeu',true)+`<p><a class="official-link" href="${esc(official(p))}" target="_blank" rel="noopener noreferrer">Abrir na fonte oficial ${svg('external')}</a></p>`;}}
function closeDrawer(){$('#drawer-scrim').hidden=true;$('#drawer').classList.remove('open');$('#drawer').setAttribute('aria-hidden','true')}
function renderVotes(j){
 if(!Array.isArray(j?.votacoes))throw Error('Formato inválido das votações oficiais');
 $('#votes-results').innerHTML=j.votacoes.length?j.votacoes.map(v=>`<article class="matter-card"><div class="matter-top"><div class="tags"><span class="source-tag">Câmara</span><span class="matter-id">Votação ${esc(v.id)}</span></div><span class="matter-date">${esc(date(v.data))}</span></div><p class="matter-title">${esc(v.descricao||'Descrição não informada pela fonte')}</p><div class="matter-foot"><span class="record-origin">Resultado: <strong>${esc(v.resultado||'Consultar registro')}</strong></span><div class="matter-actions"><a href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">Registro oficial ${svg('external')}</a></div></div></article>`).join(''):empty('Sem votações retornadas','A consulta não retornou registros para este lote.');
}
async function loadVotes(){
 state.votesLoaded=true;
 $('#votes-results').innerHTML=empty('Consultando votações','Carregando votações oficiais disponíveis.');
 let available=false;
 try{const j=await request('/data/votacoes.json?v='+Math.floor(Date.now()/120000));renderVotes(j);available=true;}catch{}
 try{const j=await request('/api/votacoes');renderVotes(j);available=true;}
 catch(e){if(!available){state.votesLoaded=false;$('#votes-results').innerHTML=empty('Votações indisponíveis',e.message||'As duas consultas falharam',true);}}
}
function renderAgenda(j){
 if(!Array.isArray(j?.eventos))throw Error('Formato inválido da agenda oficial');
 $('#agenda-results').innerHTML=j.eventos.length?j.eventos.map(v=>`<article class="matter-card"><div class="matter-top"><div class="tags"><span class="source-tag">Câmara</span><span class="matter-id">Evento ${esc(v.id)}</span></div><span class="matter-date">${esc(date(v.data))}</span></div><p class="matter-title">${esc(v.descricao||'Descrição não retornada')}</p><div class="matter-foot"><span class="record-origin">Situação cadastrada: <strong>${esc(v.situacao||'Consultar registro')}</strong></span><div class="matter-actions">${v.url.startsWith('https://dadosabertos.camara.leg.br/')?`<a href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">Registro oficial ${svg('external')}</a>`:''}</div></div></article>`).join(''):empty('Sem eventos retornados','A API não retornou eventos nesta consulta.');
}
async function loadAgenda(){
 state.agendaLoaded=true;
 $('#agenda-results').innerHTML=empty('Consultando agenda','Carregando eventos oficiais disponíveis.');
 let available=false;
 try{const j=await request('/data/agenda.json?v='+Math.floor(Date.now()/120000));renderAgenda(j);available=true;}catch{}
 try{const j=await request('/api/agenda');renderAgenda(j);available=true;}
 catch(e){if(!available){state.agendaLoaded=false;$('#agenda-results').innerHTML=empty('Agenda indisponível',e.message||'As duas consultas falharam',true);}}
}
function filtersReset(){state.pagina=1;loadMatters()}
document.addEventListener('click',e=>{const term=e.target.closest('[data-term]');if(term&&!term.matches('[data-type]')){showTerm(term);return}if(!e.target.closest('#term-popover'))hideTerm();const nav=e.target.closest('[data-page]');if(nav){setPage(nav.dataset.page);return}const chip=e.target.closest('[data-type]');if(chip){state.type=chip.dataset.type;$$$('[data-type]').forEach(b=>b.classList.toggle('active',b===chip));filtersReset();return}const link=e.target.closest('[data-detail]');if(link){detail(link.dataset.detail);return}if(e.target.closest('[data-retry]')){if(state.page==='votacoes')loadVotes();else if(state.page==='agenda')loadAgenda();else loadMatters()}});
$('#source-filter').addEventListener('change',e=>{state.source=e.target.value;filtersReset()});$('#year-filter').addEventListener('change',e=>{state.year=e.target.value;filtersReset()});let debounce;$('#query').addEventListener('input',e=>{clearTimeout(debounce);debounce=setTimeout(()=>{state.q=e.target.value.trim();state.pagina=1;loadMatters()},430)});$('#prev-page').addEventListener('click',()=>{if(state.pagina>1){state.pagina--;loadMatters()}});$('#next-page').addEventListener('click',()=>{state.pagina++;loadMatters()});$('#refresh-radar').addEventListener('click',loadMatters);$('#refresh-votes').addEventListener('click',loadVotes);$('#refresh-agenda').addEventListener('click',loadAgenda);$('#close-drawer').addEventListener('click',closeDrawer);$('#drawer-scrim').addEventListener('click',closeDrawer);document.addEventListener('keydown',e=>{if(e.key==='Escape'){hideTerm();closeDrawer()}});$('#mobile-toggle').addEventListener('click',()=>{$('#sidebar').classList.add('open');$('#mobile-overlay').classList.add('visible')});$('#mobile-overlay').addEventListener('click',()=>{$('#sidebar').classList.remove('open');$('#mobile-overlay').classList.remove('visible')});$$('[data-icon]').forEach(el=>{el.innerHTML=svg(el.dataset.icon)});$$('[data-type]').forEach(el=>{const item=glossary.find(el.dataset.type);if(item){el.dataset.term=item.id;el.title=item.nome+' — '+item.descricao}});$('#glossary-search').addEventListener('input',renderGlossary);renderGlossary();$('#date-today').textContent=new Intl.DateTimeFormat('pt-BR',{dateStyle:'long'}).format(new Date());for(let y=new Date().getFullYear();y>=2020;y--){const o=document.createElement('option');o.value=String(y);o.textContent=String(y);$('#year-filter').append(o)}loadMatters();
})();
