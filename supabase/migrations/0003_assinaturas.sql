-- ============================================================================
-- Fase 2 — Assinaturas (cortes inclusos + dependentes)
-- Um cliente (titular) tem uma assinatura com N cortes/mês. Os dependentes são
-- outros clientes cobertos pela mesma assinatura. O uso do mês soma os cortes
-- atendidos do titular + dependentes.
-- ============================================================================

create table assinaturas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cliente_id uuid not null references clientes(id) on delete cascade,
  plano_nome text not null default 'Mensal',
  cortes_inclusos int not null default 4 check (cortes_inclusos >= 0),
  valor numeric not null default 0 check (valor >= 0),
  status text not null default 'ativa' check (status in ('ativa','pausada','cancelada')),
  inicio date not null default current_date,
  created_at timestamptz default now()
);
create index idx_assinaturas_owner on assinaturas(owner_id);
-- um cliente só pode ter uma assinatura não-cancelada por vez
create unique index uidx_assinatura_titular on assinaturas(cliente_id) where status <> 'cancelada';

create table assinatura_dependentes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  assinatura_id uuid not null references assinaturas(id) on delete cascade,
  cliente_id uuid not null references clientes(id) on delete cascade
);
create index idx_dep_assinatura on assinatura_dependentes(assinatura_id);
create unique index uidx_dep on assinatura_dependentes(assinatura_id, cliente_id);

-- Uso do mês corrente por assinatura (titular + dependentes juntos).
create or replace view vw_assinatura_uso as
with cobertos as (
  select id as assinatura_id, cliente_id from assinaturas
  union
  select assinatura_id, cliente_id from assinatura_dependentes
)
select
  a.id as assinatura_id,
  a.owner_id,
  count(ag.id) filter (
    where ag.status = 'atendido'
      and date_trunc('month', ag.data) = date_trunc('month', current_date)
  ) as usados_mes
from assinaturas a
left join cobertos co on co.assinatura_id = a.id
left join agendamentos ag on ag.cliente_id = co.cliente_id
group by a.id, a.owner_id;
alter view vw_assinatura_uso set (security_invoker = true);

alter table assinaturas enable row level security;
alter table assinatura_dependentes enable row level security;

create policy "assinaturas_select_own" on assinaturas for select using (owner_id = auth.uid());
create policy "assinaturas_insert_own" on assinaturas for insert with check (owner_id = auth.uid());
create policy "assinaturas_update_own" on assinaturas for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "assinaturas_delete_own" on assinaturas for delete using (owner_id = auth.uid());

create policy "dep_select_own" on assinatura_dependentes for select using (owner_id = auth.uid());
create policy "dep_insert_own" on assinatura_dependentes for insert with check (owner_id = auth.uid());
create policy "dep_update_own" on assinatura_dependentes for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "dep_delete_own" on assinatura_dependentes for delete using (owner_id = auth.uid());
