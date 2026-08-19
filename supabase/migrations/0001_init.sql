-- ============================================================================
-- Barbearia Alemão do Corte — Sistema de automação (agenda + financeiro)
-- Operado 100% pelo celular do barbeiro. React fala direto com o Supabase
-- via PostgREST, protegido por RLS. Cada barbeiro (owner_id) só enxerga os
-- próprios dados.
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- 1. PERFIL DA BARBEARIA (1 linha por usuário, para assinar mensagens etc.)
-- ============================================================================

create table perfil (
  owner_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  barbearia_nome text not null default 'Alemão do Corte',
  instagram text default 'alemao_doo_corte',
  atualizado_em timestamptz default now()
);

-- ============================================================================
-- 2. SERVIÇOS (catálogo: corte, barba, combo…)
-- ============================================================================

create table servicos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  preco numeric not null default 0 check (preco >= 0),
  duracao_min int not null default 30 check (duracao_min > 0),
  ativo boolean not null default true,
  created_at timestamptz default now()
);

create index idx_servicos_owner on servicos(owner_id);

-- ============================================================================
-- 3. AGENDAMENTOS
-- O nome/telefone do cliente e o snapshot do serviço (nome, preço, duração)
-- ficam gravados na própria linha: o histórico e o financeiro não mudam se o
-- barbeiro depois editar ou apagar o serviço no catálogo.
-- ============================================================================

create table agendamentos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cliente_nome text not null,
  cliente_telefone text,                 -- só dígitos ou formato livre; normalizado no front pro wa.me
  servico_id uuid references servicos(id) on delete set null,
  servico_nome text not null,            -- snapshot
  preco numeric not null default 0 check (preco >= 0),  -- snapshot
  duracao_min int not null default 30 check (duracao_min > 0),
  data date not null,
  hora time not null,
  status text not null default 'agendado'
    check (status in ('agendado','atendido','faltou','cancelado')),
  lembrete_enviado boolean not null default false,
  observacao text,
  created_at timestamptz default now()
);

create index idx_agendamentos_owner_data on agendamentos(owner_id, data);

-- garante que dois clientes não fiquem no mesmíssimo horário do mesmo barbeiro
-- (agendamentos cancelados não contam; por isso um índice parcial)
create unique index uidx_agendamentos_slot
  on agendamentos(owner_id, data, hora)
  where status <> 'cancelado';

-- ============================================================================
-- 4. VIEW DE FATURAMENTO POR DIA (fonte única de verdade do financeiro)
-- Conta só o que foi efetivamente atendido.
-- ============================================================================

create or replace view vw_faturamento_dia as
select
  owner_id,
  data,
  count(*) filter (where status = 'atendido')            as atendidos,
  count(*) filter (where status = 'faltou')              as faltas,
  coalesce(sum(preco) filter (where status = 'atendido'), 0) as total
from agendamentos
group by owner_id, data;

alter view vw_faturamento_dia set (security_invoker = true);

-- ============================================================================
-- 5. SEED AUTOMÁTICO NO SIGNUP (perfil + serviços padrão da barbearia)
-- ============================================================================

create or replace function fn_seed_novo_usuario()
returns trigger as $$
begin
  insert into public.perfil (owner_id) values (new.id);

  insert into public.servicos (owner_id, nome, preco, duracao_min) values
    (new.id, 'Corte',          35, 30),
    (new.id, 'Barba',          25, 20),
    (new.id, 'Corte + Barba',  55, 45),
    (new.id, 'Sobrancelha',    15, 10),
    (new.id, 'Pezinho',        10, 10);

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_seed_novo_usuario
  after insert on auth.users
  for each row execute function fn_seed_novo_usuario();

-- ============================================================================
-- 6. RLS — obrigatório (o cliente acessa o banco direto)
-- ============================================================================

alter table perfil        enable row level security;
alter table servicos      enable row level security;
alter table agendamentos  enable row level security;

-- perfil
create policy "perfil_select_own" on perfil for select using (owner_id = auth.uid());
create policy "perfil_insert_own" on perfil for insert with check (owner_id = auth.uid());
create policy "perfil_update_own" on perfil for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- servicos
create policy "servicos_select_own" on servicos for select using (owner_id = auth.uid());
create policy "servicos_insert_own" on servicos for insert with check (owner_id = auth.uid());
create policy "servicos_update_own" on servicos for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "servicos_delete_own" on servicos for delete using (owner_id = auth.uid());

-- agendamentos
create policy "agendamentos_select_own" on agendamentos for select using (owner_id = auth.uid());
create policy "agendamentos_insert_own" on agendamentos for insert with check (owner_id = auth.uid());
create policy "agendamentos_update_own" on agendamentos for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "agendamentos_delete_own" on agendamentos for delete using (owner_id = auth.uid());
