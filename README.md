# Radar Legislativo Brasil — base executável (0.1)

Plataforma independente para consulta documental, **sem posicionamento editorial**. Neste primeiro pacote, o frontend acessa rotas que consultam APIs oficiais no momento do pedido. **Não há persistência histórica nem worker agendado ativo:** portanto isto ainda não é o rastreador completo planejado, nem há garantia de tempo real.

## Executar

- Node.js 20+
- `npm run test` e `npm run check`: verificações locais sem instalação.
- `npx vercel dev`: executar frontend e funções `api/*.js` localmente (requer Vercel CLI/autenticação).
- Implantar na Vercel como projeto Other/sem framework usando `vercel.json`.

## Rotas

- `/api/materias?fonte=todas&tipo=PEC&ano=2026&pagina=1`: busca lote de proposições; filtre também por `numero`.
- `/api/materias?q=...`: filtro `keywords` da Câmara e filtro textual sobre o lote do Senado; não é busca integral do acervo nas três instituições.
- `/api/materia?origem=camara&id=123456`: dados e tramitações de matéria da Câmara.
- `/api/materia?origem=senado&id=123456`: dados básicos normalizados do Senado (tramitações pendentes).
- `/api/votacoes`: consulta direta à Câmara (não cobre Senado/Congresso neste pacote).
- `/api/agenda`: eventos da Câmara (não cobre Senado/Congresso neste pacote).

## Escopo funcional previsto para o lançamento oficial

Todos os tipos de matérias federais, Câmara, Senado e Congresso, importação histórica, vínculo entre Casas, pesquisa completa indexada, linha do tempo de alterações, autoria, textos, deliberações, vetos por dispositivo, tarefas agendadas, banco e painel de confiabilidade das fontes. O arquivo `docs/schema.sql` é um esboço para a implementação do coletor persistente — **não é migração de produção**.

## Critérios editoriais

1. Não editorializar propostas ou pessoas.
2. Não inventar contagens, votações ou atualizações.
3. Não inferir que uma votação equivale a uma lei aprovada.
4. Mostrar indisponibilidade em vez de dados simulados.
5. Citar o URL oficial da matéria e o horário da consulta.

## Fontes

- https://dadosabertos.camara.leg.br/swagger/api.html
- https://www12.senado.leg.br/dados-abertos/legislativo/projetos-e-materias/pesquisa-materias
- https://legis.senado.leg.br/dadosabertos/docs/index.html

Licença MIT (somente código original deste repositório; dados das fontes sujeitos às regras de origem).
