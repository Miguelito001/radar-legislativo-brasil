# Radar Legislativo Brasil

**Vitrine pública de dados legislativos federais. Sem opinião editorial.**

O site apresenta registros oficiais da Câmara dos Deputados e do Senado Federal, com autoria, glossário e links de origem. O **Congresso Nacional, o histórico federal integral e a correlação entre as Casas ainda não estão cobertos integralmente**. Informações de acervo parcial devem ser identificadas como tal.

## Situação técnica

- **Site:** JavaScript sem framework obrigatório, hospedado na Vercel.
- **Coleta:** `scripts/collect.js`, com GitHub Actions a cada duas horas (execução sujeita aos limites e atrasos da plataforma).
- **Fallback:** `data/latest.json`, `data/votacoes.json` e `data/agenda.json` contêm registros de amostra oficiais, preservados no GitHub e publicados no site.
- **Proveniência:** `data/archive/AAAA/MM/DD.ndjson` armazena mudanças observadas e detectadas pelo coletor. **Uma mudança na amostra não significa que houve votação, aprovação ou tramitação.**
- **Banco principal previsto:** PostgreSQL 14+, migração em `database/migrations/001_core.sql`. Importação idempotente pronta, mas **só ativa após configurar `DATABASE_URL`**.
- **Histórico SQL:** `rl_matters` (identidade por fonte), `rl_observations` (mudança vista), `rl_movements` (atos oficiais), `rl_votings`, `rl_cursors` (continuação da importação).
- **Backfill:** `scripts/backfill-camara.js` importa páginas históricas com cursor retomável, inicialmente a partir de 2023 até o ano corrente.
- **Portabilidade:** `server.js` funciona com Node.js sem Vercel; `Dockerfile` e `compose.yaml` permitem hospedagem independente com worker e PostgreSQL.

## Executar

Instale Node.js 24+. Use `npm ci` para reproduzir as dependências do `package-lock.json`.

```sh
npm ci
npm test
npm run check
npm start
```

Abra `http://localhost:3000`. O servidor não expõe arquivos de configuração, scripts de coleta ou módulos internos.

Para infraestrutura própria, configure credenciais no `.env` (a partir de `.env.example`) e rode `docker compose up --build -d`. **Não versione .env ou dumps de banco**. O worker Docker compartilha o volume `legislative_data` com o site.

## PostgreSQL

Use uma instância PostgreSQL padrão, gerenciada ou própria. O provedor pode ser substituído com `pg_dump` e `pg_restore`, sem conversão de dados proprietária.

Defina `DATABASE_URL`:

- No GitHub Actions, em **Settings → Secrets and variables → Actions**, para as rotinas de importação;
- Na Vercel, como variável de ambiente de servidor para as consultas SQL;
- Na hospedagem independente, no ambiente do container.

Depois, rode `npm run ingest`. O importador realiza a migração inicial, importa a amostra, votações e um lote limitado de tramitações da Câmara. **Não apaga dados anteriores**. A importação histórica é separada, com limites e cursor.

Para diagnóstico consulte `/api/saude` (apenas métricas operacionais, nunca credenciais).

## Segurança e preservação

1. Não misturar identidades oficiais só porque a ementa se parece.
2. Não publicar resultados inferidos como se fossem decisões oficiais.
3. Distinguir momento do ato jurídico de momento da consulta.
4. Manter backup PostgreSQL periódico, criptografado e **fora do fornecedor que hospeda o banco**, com testes de restauração.
5. Monitorar crescimento dos arquivos versionados: GitHub não é substituto indefinido para armazenamento de objetos ou banco de dados.
6. O agendamento GitHub Actions pode atrasar e pode ser desativado por inatividade; para serviço crítico, manter executor independente.
7. Limites do provedor gratuito não são garantia de retenção ilimitada. A arquitetura é portátil justamente para permitir expansão.

## Rotas

- `/api/materias?fonte=todas&tipo=PEC&ano=2026&pagina=1`: resultado do PostgreSQL, se disponível e populado; caso contrário, consulta oficial direta.
- `/api/materia?origem=camara&id=123456`: dados e movimentações recuperáveis.
- `/api/autores?origem=camara&id=123456`: autoria oficial (também suporta `senado`).
- `/api/votacoes`: amostra de votações da Câmara.
- `/api/agenda`: amostra da agenda da Câmara.
- `/api/saude`: estado da conexão ao armazenamento SQL.

## Testes

`npm test` cobre normalização, segurança, integridade do acervo parcial, filtros, histórico incremental, portabilidade do servidor e contingência offline. A integração de PostgreSQL é testada no GitHub Actions usando uma instância real descartável.

## Fontes públicas

- https://dadosabertos.camara.leg.br/swagger/api.html
- https://www12.senado.leg.br/dados-abertos
- https://www.congressonacional.leg.br/materias

**Este projeto não tem vínculo partidário ou institucional.** A licença MIT se aplica ao código de autoria do projeto; conteúdos e dados seguem as regras das fontes originais.
