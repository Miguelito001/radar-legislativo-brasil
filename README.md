# Radar Legislativo Brasil — Radar do Dia

**Vitrine dos acontecimentos legislativos oficiais registrados no dia corrente. Sem opiniões e com orçamento de R$ 0.**

A referência temporal é **America/Sao_Paulo (horário de Brasília)**. A interface exibe apenas:
- Propostas **apresentadas hoje** na Câmara ou no Senado, nos resultados recuperáveis das fontes;
- **Votações realizadas hoje** e publicadas pela Câmara dos Deputados;
- **Eventos previstos ou realizados hoje**, conforme situação publicada pela Câmara.

Uma proposta de 2022 votada hoje pode aparecer na seção de votações. A proposta de 2022, isoladamente, **não** aparece como uma novidade. Um evento agendado não é descrito como ocorrido. Dia sem dados não recebe registros do dia anterior.

**Cobertura parcial declarada:** ainda não abrange todas as tramitações de proposições antigas, as votações e sessões do Senado ou todo o Congresso Nacional. O sistema não apresenta a amostra como totalidade do Legislativo.

## Arquitetura sem despesas

- **Frontend estático:** `index.html`, `app.js`, `day.js`, `glossary.js` e `styles.css` na Vercel Hobby.
- **Coletor:** `scripts/collect.js`, executado a cada duas horas no GitHub Actions público, gera apenas `data/today.json`.
- **Contingência:** quando o arquivo de hoje está indisponível ou defasado, `/api/hoje` consulta as APIs oficiais diretamente. Se não houver fontes, mostra indisponibilidade.
- **Economia de chamadas:** arquivos estáticos recentes evitam invocar funções de servidor a cada visita.
- **Sem histórico crescente:** a sincronização não executa `scripts/archive.js`, não importa no PostgreSQL e não executa o backfill. O Vercel Cron do PostgreSQL foi removido.
- **Virada de dia:** arquivo com campo `dia` diferente do calendário de Brasília é rejeitado, mesmo que a hospedagem ainda o tenha em cache.
- **Neon:** pode continuar conectado, mas as rotas da interface diária **não utilizam o banco**.

### Rodar

```sh
npm ci
npm test
npm run check
node scripts/collect.js
npm start
```

Acesse `http://localhost:3000`. O coletor exige acesso externo às APIs; se o dia estiver sem acontecimentos, as listas podem estar legitimamente vazias.

### Rotas

- `/api/hoje`: retorno agrupado de apresentações, votações e eventos com data do dia;
- `/api/materias`, `/api/votacoes`, `/api/agenda`: recortes diários compatíveis;
- `/api/materia?origem=camara&id=...`: metadados e **apenas tramitações/votações de hoje** no detalhe;
- `/api/autores`: nomes informados oficialmente;
- `/api/saude`: modo diário sem banco.

### Fontes e limites

- Câmara: https://dadosabertos.camara.leg.br/swagger/api.html
- Senado: https://www12.senado.leg.br/dados-abertos/legislativo
- Congresso: https://www.congressonacional.leg.br/materias

A apresentação/ementa de uma proposta não é sinônimo de tramitação do dia; a coleta classifica esses registros separadamente. As fontes podem publicar acontecimentos com atraso. Ausência de registro **não comprova ausência de atividade**.

A sincronização do GitHub Actions é melhor esforço; pausas e atrasos são possíveis. Se qualquer cota gratuita estiver próxima do limite, a política é reduzir frequência e preservar o último recorte legítimo do dia — nunca contratar infraestrutura paga automaticamente.

Código sob licença MIT. O projeto não tem vinculação institucional ou partidária.
