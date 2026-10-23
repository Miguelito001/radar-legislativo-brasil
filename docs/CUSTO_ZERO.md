# Regra orçamentária: R$ 0,00

O Radar Legislativo Brasil é um projeto de consulta pública sem orçamento de infraestrutura. **Nunca habilitar plano pago, consumo excedente faturável, serviço que exija cartão ou domínio comprado sem autorização expressa do proprietário**. A prioridade operacional é: 1) não cobrar, 2) preservar dados confirmados, 3) manter consultas essenciais, 4) melhorar frequência e abrangência apenas dentro das cotas.

## Serviços autorizados

- GitHub **repositório público**, Actions com runners padrão: usar apenas o nível sem custo.
- Vercel **Hobby**: conteúdo estático e APIs com cache; nunca migrar automaticamente para Pro.
- Neon **Free**: PostgreSQL, sem upgrade. Limite nominal de 1 GB de banco por projeto anunciado em 2026-10-02. Os limites e as políticas podem mudar.
- APIs públicas das instituições legislativas federais: respeitar limites, respostas incompletas e indisponibilidade.
- Domínio gratuito `*.vercel.app`, sem registro de domínio pago.

## Salvaguardas técnicas já aplicadas

- `database/budget.js`: alerta quando a instância PostgreSQL atingir **550 MiB**; a partir de **700 MiB** bloqueia novas gravações dos importadores. A leitura continua funcionando; registros anteriores não são apagados.
- Medição por `pg_database_size(current_database())`. **Isso mede apenas a base atual**, não o consumo agregado de todas as branches/serviços do Neon. Continuar verificando o painel do Neon.
- `/api/saude` expõe tamanho, limite interno e estado de leitura.
- GitHub Actions executa coletas agendadas em runners padrão de repositório público.
- A camada estática mantém uma amostra oficial mesmo se o PostgreSQL ficar indisponível.
- No caso de franquia gratuita esgotada: parar ou reduzir atualização e mostrar dados com data real de consulta, sem inventar atualização nem assinar novo serviço.

## O que **não** está garantido

- Não podemos prometer espaço infinito, disponibilidade 24h ou retenção gratuita eterna. Plataformas podem alterar condições.
- O guard interno **não garante que todo o projeto Neon esteja abaixo de 1 GB**: branches, armazenamento de objetos, WAL e outras métricas precisam ser vistos no painel do provedor.
- Franquias de CPU e transferências não são cobertas pelo limite em MiB. Descartar chamadas repetitivas, priorizar cache e acompanhar consumo.
- Este documento não altera planos na Vercel, no Neon ou no GitHub, nem impede que alguém com acesso administrativo faça upgrade manual.

## Estratégia de histórico

- Manter **um registro por acontecimento real**, com identificação da fonte e marca temporal; observações do crawler são separadas dos acontecimentos jurídicos.
- Evitar múltiplas cópias JSON do mesmo conteúdo. Compactar e arquivar versões antigas somente com checagem de integridade e mecanismo de leitura.
- Não armazenar PDFs e anexos integrais por padrão: guardar links oficiais, hashes e metadados verificáveis, quando apropriado.
- Se a quota aproximar-se do limite: congelar o crescimento, manter o histórico já coletado e reavaliar compressão ou alternativa gratuita legítima. Nunca apagar silenciosamente acontecimentos confirmados.
- Fazer backups para local independente quando existir um destino gratuito e com espaço suficiente. **Não supor que GitHub é armazenamento ilimitado de backups.**

Verifique periodicamente condições atuais nas páginas dos provedores: https://neon.com/blog/neon-free-plan-1-gb-per-project, https://vercel.com/docs/plans/hobby e https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job.
