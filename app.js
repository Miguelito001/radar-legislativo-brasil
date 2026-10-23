'use strict';
(function(){
const paths={grid:'M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z',files:'M7 3h9l5 5v13H7zM16 3v5h5M3 7v14',vote:'M5 9h14l2 12H3L5 9zM8 13h8M12 3v7',calendar:'M3 6h18v15H3zM7 3v6M17 3v6M3 11h18',database:'M12 3c5 0 9 2 9 4s-4 4-9 4-9-2-9-4 4-4 9-4zM3 7v10c0 2 4 4 9 4s9-2 9-4V7M3 12c0 2 4 4 9 4s9-2 9-4',external:'M13 3h8v8M21 3l-11 11M20 14v7H3V4h7',arrow:'M4 12h16m-7-7 7 7-7 7',refresh:'M20 7V3l-4 4h4a8 8 0 1 0 2 7',info:'M12 16v-4M12 8h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',building:'M3 10h18M6 10v9m6-9v9m6-9v9M2 21h20M12 2 2 8h20L12 2z',clock:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20M12 6v6l4 2',search:'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16m6-2 5 5','chevron-left':'m15 18-6-6 6-6','chevron-right':'m9 18 6-6-6-6',shield:'M12 2 3 6v6c0 6 4 9 9 10 5-1 9-4 9-10V6L12 2zM8 12l3 3 5-6',menu:'M4 6h16M4 12h16M4 18h16',book:'M3 4h8a3 3 0 0 1 3 3v14H6a3 3 0 0 0-3 1V4zm18 0h-7a3 3 0 0 0-3 3v14h7a3 3 0 0 1 3 1V4z',close:'M5 5l14 14M19 5 5 19'};
const svg=(name)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.info}"/></svg>`;
const esc=(x)=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const $=sel=>document.querySelector(sel), $$=sel=>Array.from(document.querySelectorAll(sel));
const glossary=globalThis.RadarGlossary;
const day=globalThis.RadarDay;
const today=()=>day.todayKey();
const state={page:'radar',source:'todas',type:'',q:'',pagina:1,materias:[],votacoes:[],eventos:[],fontes:[],falhas:[],last:null,votesLoaded:false,agendaLoaded:false,requestSeq:0,daily:null,snapshotUsed:false,total:0,totals:{camara:0,senado:0},shownDay:today()};
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
 for(const el of $$('[data-author-key]'))if(el.dataset.authorKey===key){
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
 for(const el of $$('[data-author-key]')){
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
 let list=day.onlyToday(rows,today());
 if(state.source!=='todas')list=list.filter(x=>x.origem===state.source);
 if(state.type)list=list.filter(x=>x.tipo===state.type);
 const search=state.q.toLocaleLowerCase('pt-BR');
 if(search)list=list.filter(x=>[x.tipo,x.numero,x.ano,x.ementa,x.situacao,x.casa].some(v=>String(v||'').toLocaleLowerCase('pt-BR').includes(search)));
 return list.sort((a,b)=>String(b.data||'').localeCompare(String(a.data||'')));
}
function renderActivity(){
 const activities=[
  ...state.materias.map(p=>({when:p.data,kind:'materia',key:p.key,html:card(p)})),
  ...state.votacoes.map(v=>({when:v.data,kind:'votacao',key:'v:'+v.id,html:voteCard(v)})),
  ...state.eventos.map(v=>({when:v.data,kind:'evento',key:'e:'+v.id,html:eventCard(v)}))
 ];
 activities.sort((a,b)=>String(b.when||'').localeCompare(String(a.when||'')));
 $('#radar-results').innerHTML=activities.slice(0,36).map(x=>x.html).join('')||
  empty('Nenhum acontecimento publicado neste recorte hoje','Isso não significa que o Congresso não teve atividades. As fontes integradas podem estar incompletas ou ainda sem publicação.');
}
function voteCard(v){
 return `<article class="matter-card"><div class="matter-top"><div class="tags"><span class="source-tag">Votação · Câmara</span><span class="matter-id">Registro ${esc(v.id)}</span></div><span class="matter-date">${esc(date(v.data))}</span></div><p class="matter-title">${esc(v.descricao||'Votação registrada oficialmente, sem descrição adicional.')}</p><div class="matter-foot"><span class="record-origin">Resultado: <strong>${esc(v.resultado||'Consultar registro oficial')}</strong></span><div class="matter-actions"><a href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">Ver votação ${svg('external')}</a></div></div></article>`;
}
function eventCard(e){
 return `<article class="matter-card"><div class="matter-top"><div class="tags"><span class="source-tag">Evento · Câmara</span><span class="matter-id">Agenda ${esc(e.id)}</span></div><span class="matter-date">${esc(date(e.data))}</span></div><p class="matter-title">${esc(e.descricao||'Evento cadastrado sem descrição.')}</p><div class="matter-foot"><span class="record-origin">Situação: <strong>${esc(e.situacao||'A confirmar na fonte')}</strong> · Agendamento não comprova realização</span><div class="matter-actions"><a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">Fonte oficial ${svg('external')}</a></div></div></article>`;
}
function applyDay(payload,{snapshot=false}={}){
 if(payload?.dia!==today())return false;
 const filtered=day.trimDaily(payload,today());
 state.daily=filtered;
 state.shownDay=today();
 state.votacoes=filtered.votacoes;
 state.eventos=filtered.eventos;
 state.snapshotUsed=snapshot;
 state.last=filtered.consultadoEm;
 state.fontes=filtered.fontesConsultadas||[];
 state.falhas=filtered.falhas||[];
 const list=filterRows(filtered.materias);
 for(const p of list)if(Array.isArray(p.autores)&&p.autores.length)authorCache.set(p.key,{autores:p.autores});
 state.total=list.length;
 state.totals={camara:state.votacoes.length,senado:state.eventos.length};
 state.materias=list.slice((state.pagina-1)*50,state.pagina*50);
 renderMatters();
 renderVotes({votacoes:state.votacoes});
 renderAgenda({eventos:state.eventos});
 state.votesLoaded=true;state.agendaLoaded=true;
 return true;
}
async function loadMatters({force=false}={}){
 const seq=++state.requestSeq;
 $('#radar-results').innerHTML=empty('Consultando acontecimentos de hoje','Buscando dados oficiais com data do dia em Brasília.');
 $('#matter-results').innerHTML=empty('Consultando apresentações de hoje','Carregando a lista do dia.');
 $('#results-summary').textContent='Consultando fontes oficiais...';
 let valid=false;
 try{
  const cached=await request('/data/today.json?v='+Math.floor(Date.now()/120000));
  if(seq!==state.requestSeq)return;
  valid=applyDay(cached,{snapshot:true});
  if(valid&&!force&&Date.now()-Date.parse(cached.consultadoEm)<90*60*1000)return;
 }catch(e){console.warn('Amostra diária não disponível:',e?.message||e)}
 try{
  const live=await request('/api/hoje?v='+Math.floor(Date.now()/120000));
  if(seq!==state.requestSeq)return;
  if(!applyDay(live,{snapshot:false}))throw Error('A fonte devolveu dados de outra data.');
  valid=true;
 }catch(e){
  if(seq!==state.requestSeq)return;
  if(valid){
   state.falhas.push({fonte:'consulta-direta',erro:'Consulta ao vivo indisponível. Exibindo a última captura de hoje.'});
   renderMatters();
  }else{
   state.daily=null;state.materias=[];state.votacoes=[];state.eventos=[];
   state.total=0;
   $('#radar-results').innerHTML=empty('Consulta do dia indisponível','Não foi possível verificar os acontecimentos de hoje. Dados de ontem não serão exibidos.',true);
   $('#matter-results').innerHTML=empty('Consulta do dia indisponível','As fontes oficiais não responderam.',true);
   $('#votes-results').innerHTML=empty('Votações indisponíveis','Não é possível confirmar votações de hoje.');
   $('#agenda-results').innerHTML=empty('Agenda indisponível','Não é possível confirmar eventos de hoje.');
   $('#results-summary').textContent='Sem dados verificados para hoje';
   $('#count-matters').textContent=$('#count-camara').textContent=$('#count-senado').textContent=$('#count-update').textContent='—';
   $('#sidebar-sync').textContent='Fontes indisponíveis';
  }
 }
}
function renderMatters(){
 const list=state.materias;
 $('#matter-results').innerHTML=list.map(card).join('')||
  empty('Nenhuma apresentação encontrada hoje','Não há registros de apresentação nesta consulta parcial do dia.');
 renderActivity();
 $('#results-summary').textContent=state.total.toLocaleString('pt-BR')+' matérias apresentadas hoje (no recorte disponível)'+(state.falhas.length?' · consulta parcial':'');
 $('#count-matters').textContent=state.total.toLocaleString('pt-BR');
 $('#count-camara').textContent=state.votacoes.length.toLocaleString('pt-BR');
 $('#count-senado').textContent=state.eventos.length.toLocaleString('pt-BR');
 $('#count-update').textContent=time(state.last);
 $('#sidebar-sync').textContent=(state.falhas.length?'Cobertura parcial · ':'Consultado às ')+time(state.last);
 $('#page-indicator').textContent='Página '+state.pagina;
 $('#prev-page').disabled=state.pagina<=1;
 $('#next-page').disabled=state.pagina*50>=state.total;
 hydrateAuthors();
}

async function detail(key){const p=state.materias.find(x=>x.key===key);if(!p)return;$('#drawer-scrim').hidden=false;$('#drawer').classList.add('open');$('#drawer').setAttribute('aria-hidden','false');$('#drawer-content').innerHTML=empty('Consultando atos oficiais','Consultando os registros detalhados na fonte oficial.');try{const j=await request(`/api/materia?origem=${encodeURIComponent(p.origem)}&id=${encodeURIComponent(p.id)}`);const m=j.materia||p;const tr=day.onlyToday(j.tramitacoes||[],today());const vs=day.onlyToday(j.votacoes||[],today());$('#drawer-content').innerHTML=`<div class="tags">${termBadge(m.tipo)}<span class="source-tag">${esc(m.casa)}</span></div><h2 id="drawer-title">${esc(m.tipo)} ${esc(m.numero)}/${esc(m.ano)}</h2><p class="drawer-type-name">${esc(glossary.find(m.tipo)?.nome||"Tipo segundo a fonte oficial")}</p><p>${esc(m.ementa||'Ementa não publicada no resultado.')}</p><div class="drawer-meta"><div><small>Data de apresentação</small><strong>${esc(date(m.data))}</strong></div><div><small>Situação oficial</small><strong>${esc(j.detalhes?.situacao||'Consultar a fonte')}</strong></div><div><small>Identificador da fonte</small><strong>${esc(m.id)}</strong></div><div><small>Consulta realizada</small><strong>${esc(time(j.consultadoEm))}</strong></div></div><div class="detail-authors"><h3>Autoria registrada</h3><p class="author-pending" data-author-key="${esc(m.key||p.key)}">Consultando registro oficial…</p></div><a class="official-link" href="${esc(official(m))}" target="_blank" rel="noopener noreferrer">Abrir ficha oficial ${svg('external')}</a><h3>Tramitações identificadas hoje (${tr.length})</h3>${tr.length?`<div class="drawer-events">${tr.map(t=>`<div class="drawer-event"><time>${esc(date(t.data))}</time><p>${esc(t.descricao||t.despacho||'Ato registrado')}</p><small>${esc(t.orgao||'')}</small></div>`).join('')}</div>`:'<p>Nenhuma tramitação de hoje foi identificada nesta consulta. A ficha oficial pode conter outras movimentações.</p>'}<h3>Votações vinculadas hoje (${vs.length})</h3>${vs.length?vs.map(v=>`<div class="drawer-event"><time>${esc(date(v.data))}</time><p>${esc(v.descricao)}</p><small>${esc(v.resultado||'')}</small></div>`).join(''):'<p>Nenhuma votação foi retornada nesta consulta. Isso não comprova ausência de deliberações.</p>'}${(j.avisos||[]).map(a=>`<p class="error-small">${esc(a)}</p>`).join('')}`;
 hydrateAuthors();
 }catch(e){$('#drawer-content').innerHTML=empty('Detalhes indisponíveis',e.message||'Fonte não respondeu',true)+`<p><a class="official-link" href="${esc(official(p))}" target="_blank" rel="noopener noreferrer">Abrir na fonte oficial ${svg('external')}</a></p>`;}}
function closeDrawer(){$('#drawer-scrim').hidden=true;$('#drawer').classList.remove('open');$('#drawer').setAttribute('aria-hidden','true')}

function renderVotes(j){
 const votes=day.onlyToday(j?.votacoes,today());
 $('#votes-results').innerHTML=votes.length?votes.map(voteCard).join(''):empty('Nenhuma votação encontrada hoje','As fontes integradas não retornaram votações com data de hoje.');
}
function renderAgenda(j){
 const events=day.onlyToday(j?.eventos,today());
 $('#agenda-results').innerHTML=events.length?events.map(eventCard).join(''):empty('Nenhum evento encontrado hoje','A agenda da Câmara não retornou eventos para hoje nesta consulta.');
}
function loadVotes(){if(state.daily&&state.shownDay===today())renderVotes({votacoes:state.votacoes});else loadMatters()}
function loadAgenda(){if(state.daily&&state.shownDay===today())renderAgenda({eventos:state.eventos});else loadMatters()}

function filtersReset(){state.pagina=1;if(state.daily&&state.shownDay===today())applyDay(state.daily,{snapshot:state.snapshotUsed});else loadMatters()}
document.addEventListener('click',e=>{const term=e.target.closest('[data-term]');if(term&&!term.matches('[data-type]')){showTerm(term);return}if(!e.target.closest('#term-popover'))hideTerm();const nav=e.target.closest('[data-page]');if(nav){setPage(nav.dataset.page);return}const chip=e.target.closest('[data-type]');if(chip){state.type=chip.dataset.type;$$('[data-type]').forEach(b=>b.classList.toggle('active',b===chip));filtersReset();return}const link=e.target.closest('[data-detail]');if(link){detail(link.dataset.detail);return}if(e.target.closest('[data-retry]')){if(state.page==='votacoes')loadVotes();else if(state.page==='agenda')loadAgenda();else loadMatters()}});
$('#source-filter').addEventListener('change',e=>{state.source=e.target.value;filtersReset()});let debounce;$('#query').addEventListener('input',e=>{clearTimeout(debounce);debounce=setTimeout(()=>{state.q=e.target.value.trim();state.pagina=1;filtersReset()},430)});$('#prev-page').addEventListener('click',()=>{if(state.pagina>1){state.pagina--;filtersReset()}});$('#next-page').addEventListener('click',()=>{state.pagina++;filtersReset()});$('#refresh-radar').addEventListener('click',()=>loadMatters({force:true}));$('#refresh-votes').addEventListener('click',()=>loadMatters({force:true}));$('#refresh-agenda').addEventListener('click',()=>loadMatters({force:true}));$('#close-drawer').addEventListener('click',closeDrawer);$('#drawer-scrim').addEventListener('click',closeDrawer);document.addEventListener('keydown',e=>{if(e.key==='Escape'){hideTerm();closeDrawer()}});$('#mobile-toggle').addEventListener('click',()=>{$('#sidebar').classList.add('open');$('#mobile-overlay').classList.add('visible')});$('#mobile-overlay').addEventListener('click',()=>{$('#sidebar').classList.remove('open');$('#mobile-overlay').classList.remove('visible')});$$('[data-icon]').forEach(el=>{el.innerHTML=svg(el.dataset.icon)});$$('[data-type]').forEach(el=>{const item=glossary.find(el.dataset.type);if(item){el.dataset.term=item.id;el.title=item.nome+' — '+item.descricao}});$('#glossary-search').addEventListener('input',renderGlossary);renderGlossary();$('#date-today').textContent=new Intl.DateTimeFormat('pt-BR',{dateStyle:'long',timeZone:'America/Sao_Paulo'}).format(new Date());loadMatters();setInterval(()=>{if(state.shownDay!==today()){state.daily=null;state.pagina=1;$('#date-today').textContent=new Intl.DateTimeFormat('pt-BR',{dateStyle:'long',timeZone:'America/Sao_Paulo'}).format(new Date());loadMatters()}},60000);
})();
