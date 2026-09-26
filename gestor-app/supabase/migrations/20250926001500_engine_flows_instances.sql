-- Flujos publicados (definición BPMN completa en JSON)
create table if not exists public.flows (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'general',
  description text,
  status text not null default 'borrador' check (status in ('borrador', 'listo')),
  definition jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists flows_status_idx on public.flows (status);

-- Instancias en ejecución
create table if not exists public.instances (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references public.flows (id) on delete restrict,
  status text not null default 'en_curso' check (
    status in ('en_curso', 'completada', 'cerrada_rechazo')
  ),
  current_node_id text,
  input_values jsonb not null default '{}'::jsonb,
  context jsonb not null default '{}'::jsonb,
  flow_snapshot jsonb not null,
  trace jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  ai_hitl_status text,
  ai_hitl_sent_at timestamptz,
  ai_hitl_reminders integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists instances_flow_id_idx on public.instances (flow_id);
create index if not exists instances_status_idx on public.instances (status);

alter table public.flows enable row level security;
alter table public.instances enable row level security;

-- Políticas abiertas para el mock (ajustar con auth en producción)
create policy "flows_read_all" on public.flows for select using (true);
create policy "flows_write_all" on public.flows for all using (true) with check (true);
create policy "instances_read_all" on public.instances for select using (true);
create policy "instances_write_all" on public.instances for all using (true) with check (true);
