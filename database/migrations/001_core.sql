-- Radar Legislativo Brasil: schema PostgreSQL 14+.
-- A identidade é sempre da fonte. Matérias em duas Casas não são unificadas por semelhança textual.
begin;
create table if not exists rl_schema_migrations (
 version text primary key,
 applied_at timestamptz not null default now()
);
create table if not exists rl_sources (
 id text primary key check (id in ('camara','senado','congresso')),
 description text not null,
 updated_at timestamptz
);
insert into rl_sources(id,description) values
 ('camara','Câmara dos Deputados'),
 ('senado','Senado Federal'),
 ('congresso','Congresso Nacional')
on conflict (id) do nothing;

create table if not exists rl_matters (
 source text not null references rl_sources(id),
 external_id text not null,
 kind text not null,
 matter_number text not null,
 matter_year integer not null check (matter_year between 1800 and 2200),
 ementa text,
 official_url text not null,
 presentation_at timestamptz,
 status_text text,
 authors jsonb not null default '[]'::jsonb,
 current_hash text not null check (length(current_hash)=64),
 latest_raw jsonb not null,
 first_observed_at timestamptz not null default now(),
 last_observed_at timestamptz not null default now(),
 current_changed_at timestamptz not null default now(),
 primary key (source,external_id)
);
create index if not exists rl_matters_year_kind_idx on rl_matters(matter_year desc,kind,source);
create index if not exists rl_matters_presented_idx on rl_matters(presentation_at desc);
create index if not exists rl_matters_search_idx on rl_matters using gin
 (to_tsvector('portuguese',coalesce(ementa,'')||' '||kind||' '||matter_number));

-- Registra SOMENTE mudanças observadas pelo coletor, sem chamá-las de atos legislativos.
create table if not exists rl_observations (
 id bigint generated always as identity primary key,
 source text not null,
 external_id text not null,
 fingerprint text not null check(length(fingerprint)=64),
 observed_at timestamptz not null default now(),
 snapshot jsonb not null,
 unique (source,external_id,fingerprint),
 foreign key(source,external_id) references rl_matters(source,external_id)
);
create index if not exists rl_observations_date_idx on rl_observations(observed_at desc);

-- Atos de tramitação recuperados das fontes, armazenados separadamente das observações.
create table if not exists rl_movements (
 source text not null,
 external_id text not null,
 official_key text not null,
 occured_at timestamptz,
 office text,
 official_description text not null,
 official_dispatch text,
 raw jsonb not null,
 fetched_at timestamptz not null default now(),
 primary key(source,external_id,official_key),
 foreign key(source,external_id) references rl_matters(source,external_id)
);
create index if not exists rl_movements_date_idx on rl_movements(occured_at desc);

create table if not exists rl_votings (
 source text not null references rl_sources(id),
 external_id text not null,
 voted_at timestamptz,
 official_description text,
 official_result text,
 raw jsonb not null,
 fetched_at timestamptz not null default now(),
 primary key(source,external_id)
);
create table if not exists rl_voting_targets (
 voting_source text not null,
 voting_external_id text not null,
 matter_source text not null,
 matter_external_id text not null,
 relation_kind text not null,
 official_reference text,
 primary key(voting_source,voting_external_id,matter_source,matter_external_id,relation_kind),
 foreign key(voting_source,voting_external_id) references rl_votings(source,external_id),
 foreign key(matter_source,matter_external_id) references rl_matters(source,external_id)
);
create table if not exists rl_sync_runs (
 id bigint generated always as identity primary key,
 source text not null references rl_sources(id),
 started_at timestamptz not null default now(),
 finished_at timestamptz,
 result text not null check(result in ('running','completed','partial','failed')),
 records_read integer not null default 0,
 new_observations integer not null default 0,
 error_message text
);
create index if not exists rl_sync_runs_source_idx on rl_sync_runs(source,started_at desc);

-- Backfill recomeça de um cursor persistido, nunca de um número inventado.
create table if not exists rl_cursors (
 source text not null references rl_sources(id),
 stream text not null,
 cursor_state jsonb not null,
 saved_at timestamptz not null default now(),
 primary key (source,stream)
);
insert into rl_schema_migrations(version) values ('001_core') on conflict do nothing;
commit;
