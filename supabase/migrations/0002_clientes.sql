-- ============================================================================
-- Fase 1 — Ficha do cliente + histórico
-- Escopo por dono (owner_id), igual a servicos/agendamentos. Quando entrar o
-- modelo multi-barbeiro (fase 3), owner_id vira o vínculo com a barbearia.
-- ============================================================================

create table clientes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  telefone text,
  aniversario date,
  observacoes text,
  created_at timestamptz default now()
);

create index idx_clientes_owner on clientes(owner_id);
create index idx_clientes_nome on clientes(owner_id, lower(nome));

-- Vincula um agendamento a um cliente (opcional; construído aos poucos).
alter table agendamentos
  add column if not exists cliente_id uuid references clientes(id) on delete set null;
create index if not exists idx_agendamentos_cliente on agendamentos(cliente_id);

-- Resumo por cliente: nº de visitas (atendidas), última visita e total gasto.
create or replace view vw_cliente_resumo as
select
  c.id as cliente_id,
  c.owner_id,
  count(a.id) filter (where a.status = 'atendido')                as visitas,
  max(a.data) filter (where a.status = 'atendido')                as ultima_visita,
  coalesce(sum(a.preco) filter (where a.status = 'atendido'), 0)  as total_gasto
from clientes c
left join agendamentos a on a.cliente_id = c.id
group by c.id, c.owner_id;

alter view vw_cliente_resumo set (security_invoker = true);

-- RLS
alter table clientes enable row level security;

create policy "clientes_select_own" on clientes for select using (owner_id = auth.uid());
create policy "clientes_insert_own" on clientes for insert with check (owner_id = auth.uid());
create policy "clientes_update_own" on clientes for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "clientes_delete_own" on clientes for delete using (owner_id = auth.uid());
