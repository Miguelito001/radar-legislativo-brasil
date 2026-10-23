# Armazenamento persistente e portátil

A implementação utiliza **PostgreSQL 14+ sem extensões proprietárias**. A instância pode estar no Neon, Supabase, RDS ou em infraestrutura administrada pelo proprietário.

### Por que separar a identidade das Casas?

`rl_matters` usa a chave composta (`source`, `external_id`). Um PL no Senado e outro na Câmara não são automaticamente a mesma matéria. `rl_movements` armazena os atos publicados pelas fontes. `rl_observations` registra apenas **mudanças percebidas na coleta**, sem atribuir significado jurídico a elas.

### Ativação

1. Provisionar um banco PostgreSQL e criar um usuário com permissões restritas ao banco da aplicação.
2. Inserir `DATABASE_URL` como **GitHub Actions secret** para o importador (não em arquivo versionado).
3. Inserir `DATABASE_URL` como variável de ambiente das funções serverless na Vercel quando os endpoints SQL forem habilitados.
4. Executar `node scripts/ingest.js`. A migração inicial é idempotente.

A ausência de `DATABASE_URL` mantém o site funcionando com a coleta oficial estática. Nenhum arquivo de dados é inventado quando o banco não está disponível.

### Operação de longo prazo

- Código, SQL e contratos são versionados e independentes de fornecedor.
- Cron agendado é *melhor esforço*; não há garantia de execução a cada dois minutos.
- Fazer backup com `pg_dump --format=custom`, criptografar e guardar **fora do provedor principal**. Testar restauração regularmente. Não versionar backups completos dentro do GitHub.
- Monitorar crescimento, atrasos de ingestão, taxa de erro, tempo de recuperação e cobertura histórica por órgão.
- Antes de anunciar cobertura completa, implementar backfill paginado por intervalos históricos, correlação oficial Câmara ↔ Senado, votações nominais, vetos e Congresso Nacional.
