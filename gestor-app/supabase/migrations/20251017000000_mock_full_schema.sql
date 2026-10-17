-- Esquema completo del mock (flujos, maestros, usuarios). Proyecto personal — RLS abierta en dev.

-- flows: ids de texto compatibles con el mock (flow_xxx)
alter table public.flows drop constraint if exists flows_status_check;

alter table public.flows
  alter column id type text using id::text;

alter table public.instances
  alter column flow_id type text using flow_id::text;

alter table public.flows
  add column if not exists lineage_id text,
  add column if not exists version integer,
  add column if not exists supersedes_flow_id text,
  add column if not exists flow_type_id text;

alter table public.flows
  add constraint flows_status_check check (status in ('borrador', 'listo', 'deprecado'));

create index if not exists flows_lineage_id_idx on public.flows (lineage_id);
create index if not exists flows_flow_type_id_idx on public.flows (flow_type_id);

-- Tipos de flujo
create table if not exists public.flow_types (
  id text primary key,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Entidades (definición en jsonb)
create table if not exists public.entities (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Definiciones de maestros
create table if not exists public.master_definitions (
  id text primary key,
  name text not null,
  description text,
  entity_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Registros de maestros
create table if not exists public.master_records (
  id text primary key,
  definition_id text not null references public.master_definitions (id) on delete restrict,
  lineage_id text,
  status text not null default 'vigente',
  version integer,
  values jsonb not null default '{}'::jsonb,
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists master_records_definition_id_idx on public.master_records (definition_id);

-- Auditoría de maestros
create table if not exists public.master_audit (
  id text primary key,
  at timestamptz not null,
  user_id text,
  user_label text,
  area text not null,
  action text not null,
  ref_id text,
  label text,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists master_audit_at_idx on public.master_audit (at desc);

-- Usuarios mock (login local; no Supabase Auth en fase 1)
create table if not exists public.app_users (
  id text primary key,
  username text not null unique,
  display_name text not null,
  password text not null default '',
  active boolean not null default true,
  avatar_seed text,
  is_system boolean not null default false,
  login_allowed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.flow_types enable row level security;
alter table public.entities enable row level security;
alter table public.master_definitions enable row level security;
alter table public.master_records enable row level security;
alter table public.master_audit enable row level security;
alter table public.app_users enable row level security;

create policy "flow_types_all" on public.flow_types for all using (true) with check (true);
create policy "entities_all" on public.entities for all using (true) with check (true);
create policy "master_definitions_all" on public.master_definitions for all using (true) with check (true);
create policy "master_records_all" on public.master_records for all using (true) with check (true);
create policy "master_audit_all" on public.master_audit for all using (true) with check (true);
create policy "app_users_all" on public.app_users for all using (true) with check (true);
