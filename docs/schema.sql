-- Esquema inicial planejado: exigirá revisão e migração antes de uso em produção.
create table if not exists sources (
  id text primary key,
  name text not null,
  last_success_at timestamptz,
  last_error text
);
create table if not exists matters (
  id bigserial primary key,
  kind text not null,
  number text not null,
  year int not null,
  title text,
  synopsis text,
  created_at timestamptz default now()
);
create table if not exists matter_sources (
  source_id text not null references sources(id),
  external_id text not null,
  matter_id bigint not null references matters(id),
  official_url text not null,
  last_seen_at timestamptz not null default now(),
  primary key(source_id,external_id)
);
create table if not exists matter_events (
  id bigserial primary key,
  matter_id bigint not null references matters(id),
  source_id text not null references sources(id),
  external_event_id text not null,
  occurred_at timestamptz,
  observed_at timestamptz not null default now(),
  kind text not null,
  official_description text,
  raw jsonb not null,
  unique(source_id,external_event_id)
);
create table if not exists matter_relations (
  source_matter_id bigint not null references matters(id),
  target_matter_id bigint not null references matters(id),
  relation_type text not null,
  official_reference text,
  primary key(source_matter_id,target_matter_id,relation_type)
);
create table if not exists voting_sessions (
  id bigserial primary key,
  source_id text not null references sources(id),
  external_id text not null,
  held_at timestamptz,
  official_result text,
  raw jsonb not null,
  unique(source_id,external_id)
);
create table if not exists voting_targets (
  voting_id bigint not null references voting_sessions(id),
  matter_id bigint not null references matters(id),
  relation_kind text not null,
  primary key(voting_id,matter_id,relation_kind)
);
create table if not exists sync_runs (
  id bigserial primary key,
  source_id text not null references sources(id),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null,
  items_processed integer not null default 0,
  error text
);
