-- ============================================================================
-- Sistema de Ficha Técnica e Precificação — Migration inicial
-- Fonte única de verdade: toda a matemática de custo/preço vive aqui
-- (functions + views). Backend inexistente: React fala direto com o Supabase
-- via PostgREST, protegido por RLS.
-- ============================================================================

-- Extensão para gen_random_uuid()
create extension if not exists pgcrypto;

-- ============================================================================
-- 1. UNIDADES DE MEDIDA (dado de referência global, leitura pública)
-- ============================================================================

create table unidades_medida (
  id serial primary key,
  nome text not null,
  sigla text not null unique,
  dimensao text not null check (dimensao in ('massa','volume','contagem')),
  fator_base numeric not null check (fator_base > 0)
);

insert into unidades_medida (nome, sigla, dimensao, fator_base) values
 ('Quilograma','kg','massa',1000),('Grama','g','massa',1),('Miligrama','mg','massa',0.001),
 ('Litro','L','volume',1000),('Mililitro','ml','volume',1),
 ('Unidade','un','contagem',1),('Dúzia','duzia','contagem',12);

-- ============================================================================
-- 2. CATEGORIAS (multi-lojista: cada dono vê só as suas)
-- ============================================================================

create table categorias (
  id serial primary key,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('insumo','produto'))
);

-- ============================================================================
-- 3. INSUMOS (estoque)
-- ============================================================================

create table insumos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  categoria_id int references categorias(id),
  unidade_compra_id int not null references unidades_medida(id),
  quantidade_compra numeric not null check (quantidade_compra > 0),
  preco_compra numeric not null check (preco_compra >= 0),
  estoque_atual numeric default 0,
  estoque_minimo numeric default 0,
  ativo boolean default true,
  created_at timestamptz default now()
);

create index idx_insumos_owner on insumos(owner_id);

-- ============================================================================
-- 4. PLATAFORMAS DE VENDA (multi-lojista: cada dono configura as suas taxas)
-- ============================================================================

create table plataformas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  taxa_percentual numeric not null check (taxa_percentual >= 0 and taxa_percentual < 1),
  taxa_fixa numeric not null default 0 check (taxa_fixa >= 0),
  ativo boolean default true
);

create index idx_plataformas_owner on plataformas(owner_id);

-- ============================================================================
-- 5. PRODUTOS DO CARDÁPIO
-- ============================================================================

create table produtos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  categoria_id int references categorias(id),
  margem_tipo text not null default 'markup_custo'
     check (margem_tipo in ('markup_custo','margem_venda')),
  margem_valor numeric not null default 0.20 check (margem_valor >= 0 and margem_valor < 1),
  custo_embalagem numeric not null default 0 check (custo_embalagem >= 0),
  custo_operacional numeric not null default 0 check (custo_operacional >= 0),
  preco_manual numeric check (preco_manual is null or preco_manual >= 0), -- override opcional
  ativo boolean default true,
  created_at timestamptz default now()
);

create index idx_produtos_owner on produtos(owner_id);

-- ============================================================================
-- 6. PRODUTO_INSUMOS (receita/ficha técnica)
-- ============================================================================

create table produto_insumos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  produto_id uuid not null references produtos(id) on delete cascade,
  insumo_id uuid not null references insumos(id),
  quantidade_uso numeric not null check (quantidade_uso > 0),
  unidade_uso_id int not null references unidades_medida(id),
  fator_perda numeric not null default 0 check (fator_perda >= 0)
);

create index idx_produto_insumos_owner on produto_insumos(owner_id);
create index idx_produto_insumos_produto on produto_insumos(produto_id);

-- Defesa em profundidade, validada já na ESCRITA (não só na leitura via
-- fn_custo_item): impede (a) item de receita cruzando dono diferente do
-- produto/insumo (cross-tenant) e (b) unidade de uso com dimensão
-- incompatível com a unidade de compra do insumo — mesma regra do §3 do
-- prompt, mas antecipada para o insert/update em vez de só estourar quando
-- alguém consulta vw_produto_ficha / vw_produto_precos.
create or replace function fn_valida_produto_insumos()
returns trigger as $$
declare
  v_owner_produto uuid;
  v_owner_insumo uuid;
  v_dim_compra text;
  v_dim_uso text;
  v_nome_insumo text;
begin
  select owner_id into v_owner_produto from produtos where id = new.produto_id;
  select owner_id, nome into v_owner_insumo, v_nome_insumo from insumos where id = new.insumo_id;
  if v_owner_produto is distinct from new.owner_id or v_owner_insumo is distinct from new.owner_id then
    raise exception 'Produto e insumo devem pertencer ao mesmo usuário do item de receita';
  end if;

  select um_compra.dimensao, um_uso.dimensao
    into v_dim_compra, v_dim_uso
  from insumos i
  join unidades_medida um_compra on um_compra.id = i.unidade_compra_id
  join unidades_medida um_uso on um_uso.id = new.unidade_uso_id
  where i.id = new.insumo_id;

  if v_dim_compra <> v_dim_uso then
    raise exception 'Unidade incompatível: insumo % comprado em dimensão % mas usado em dimensão % (dimensões diferentes)',
      v_nome_insumo, v_dim_compra, v_dim_uso;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_valida_produto_insumos
  before insert or update on produto_insumos
  for each row execute function fn_valida_produto_insumos();

-- ============================================================================
-- 7. FUNCTIONS DE CÁLCULO (núcleo — §3 e §4 do prompt)
-- ============================================================================

-- Custo por unidade base de um insumo (ex.: custo por grama)
create or replace function fn_custo_base(p_insumo insumos) returns numeric as $$
  select p_insumo.preco_compra
       / (p_insumo.quantidade_compra
          * (select fator_base from unidades_medida where id = p_insumo.unidade_compra_id));
$$ language sql stable;

-- Custo de um item de receita, com validação rígida de dimensão
create or replace function fn_custo_item(p_item produto_insumos) returns numeric as $$
declare
  v_ins insumos;
  v_dim_uso text; v_dim_compra text; v_fator_uso numeric;
begin
  select * into v_ins from insumos where id = p_item.insumo_id;
  select dimensao, fator_base into v_dim_uso, v_fator_uso
    from unidades_medida where id = p_item.unidade_uso_id;
  select dimensao into v_dim_compra
    from unidades_medida where id = v_ins.unidade_compra_id;
  if v_dim_uso <> v_dim_compra then
    raise exception 'Unidade incompatível: insumo % comprado em % mas usado em % (dimensões diferentes)',
      v_ins.nome, v_dim_compra, v_dim_uso;
  end if;
  return (p_item.quantidade_uso * v_fator_uso)
         * fn_custo_base(v_ins)
         * (1 + p_item.fator_perda);
end;
$$ language plpgsql stable;

-- ============================================================================
-- 8. VIEWS DE PREÇO (§4 e §5 do prompt — fonte única de verdade)
-- ============================================================================

-- Custo total por produto (soma dos itens + embalagem + operacional)
-- e flag indicando se o produto tem receita cadastrada.
create or replace view vw_produto_custo as
select p.id as produto_id,
       p.owner_id,
       coalesce(sum(fn_custo_item(pi.*)), 0)
         + p.custo_embalagem + p.custo_operacional as custo_total,
       count(pi.id) as qtd_itens_receita
from produtos p
left join produto_insumos pi on pi.produto_id = p.id
group by p.id, p.owner_id, p.custo_embalagem, p.custo_operacional;

alter view vw_produto_custo set (security_invoker = true);

-- Preço-alvo por produto (o que o dono quer receber líquido)
create or replace view vw_produto_preco_alvo as
select p.id as produto_id,
       p.owner_id,
       c.custo_total,
       c.qtd_itens_receita,
       case p.margem_tipo
         when 'markup_custo' then c.custo_total * (1 + p.margem_valor)
         when 'margem_venda' then c.custo_total / (1 - p.margem_valor)
       end as preco_alvo,
       p.preco_manual
from produtos p
join vw_produto_custo c on c.produto_id = p.id;

alter view vw_produto_preco_alvo set (security_invoker = true);

-- Preço final por produto x plataforma (CRÍTICO: dividir, nunca somar a taxa)
create or replace view vw_produto_precos as
select a.produto_id, a.owner_id, pl.id as plataforma_id, pl.nome as plataforma,
       a.custo_total,
       a.qtd_itens_receita,
       coalesce(a.preco_manual, a.preco_alvo) as preco_alvo,
       (coalesce(a.preco_manual, a.preco_alvo) + pl.taxa_fixa) / (1 - pl.taxa_percentual)
         as preco_sugerido,
       -- lucro líquido real após taxa (o que sobra do preço-alvo acima do custo)
       (coalesce(a.preco_manual, a.preco_alvo)) - a.custo_total as lucro_liquido,
       case when a.custo_total > 0
            then (coalesce(a.preco_manual, a.preco_alvo) - a.custo_total) / a.custo_total
            else null end as markup_efetivo
from vw_produto_preco_alvo a
cross join plataformas pl
where pl.ativo = true and pl.owner_id = a.owner_id;

alter view vw_produto_precos set (security_invoker = true);

-- Ficha técnica completa: item a item, com custo calculado e sinalização
-- de insumo inativo (§8 do prompt).
create or replace view vw_produto_ficha as
select
  pi.id as item_id,
  pi.produto_id,
  pi.owner_id,
  pi.insumo_id,
  i.nome as insumo_nome,
  i.ativo as insumo_ativo,
  pi.quantidade_uso,
  pi.unidade_uso_id,
  um.sigla as unidade_uso_sigla,
  um.nome as unidade_uso_nome,
  pi.fator_perda,
  fn_custo_base(i.*) as custo_base_insumo,
  fn_custo_item(pi.*) as custo_item
from produto_insumos pi
join insumos i on i.id = pi.insumo_id
join unidades_medida um on um.id = pi.unidade_uso_id;

alter view vw_produto_ficha set (security_invoker = true);

-- ============================================================================
-- 9. SEED AUTOMÁTICO DE PLATAFORMAS POR NOVO USUÁRIO
-- ============================================================================
-- Como plataformas agora é multi-lojista (owner_id), não dá pra seedar
-- linhas globais na migration. Em vez disso, cada novo usuário ganha o
-- conjunto padrão (Balcão, iFood, 99Food) automaticamente no signup.

create or replace function fn_seed_plataformas_novo_usuario()
returns trigger as $$
begin
  insert into public.plataformas (owner_id, nome, taxa_percentual, taxa_fixa) values
    (new.id, 'Balcão', 0, 0),
    (new.id, 'iFood', 0.20, 0),
    (new.id, '99Food', 0.20, 0);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_seed_plataformas_novo_usuario
  after insert on auth.users
  for each row execute function fn_seed_plataformas_novo_usuario();

-- ============================================================================
-- 10. RLS — camada de segurança obrigatória (o cliente acessa o banco direto)
-- ============================================================================

alter table unidades_medida enable row level security;
alter table categorias enable row level security;
alter table insumos enable row level security;
alter table plataformas enable row level security;
alter table produtos enable row level security;
alter table produto_insumos enable row level security;

-- unidades_medida: dado de referência, leitura pública (mesmo anônimo)
create policy "unidades_medida_select_publico"
  on unidades_medida for select
  using (true);

-- categorias
create policy "categorias_select_own"
  on categorias for select using (owner_id = auth.uid());
create policy "categorias_insert_own"
  on categorias for insert with check (owner_id = auth.uid());
create policy "categorias_update_own"
  on categorias for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "categorias_delete_own"
  on categorias for delete using (owner_id = auth.uid());

-- insumos
create policy "insumos_select_own"
  on insumos for select using (owner_id = auth.uid());
create policy "insumos_insert_own"
  on insumos for insert with check (owner_id = auth.uid());
create policy "insumos_update_own"
  on insumos for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "insumos_delete_own"
  on insumos for delete using (owner_id = auth.uid());

-- plataformas
create policy "plataformas_select_own"
  on plataformas for select using (owner_id = auth.uid());
create policy "plataformas_insert_own"
  on plataformas for insert with check (owner_id = auth.uid());
create policy "plataformas_update_own"
  on plataformas for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "plataformas_delete_own"
  on plataformas for delete using (owner_id = auth.uid());

-- produtos
create policy "produtos_select_own"
  on produtos for select using (owner_id = auth.uid());
create policy "produtos_insert_own"
  on produtos for insert with check (owner_id = auth.uid());
create policy "produtos_update_own"
  on produtos for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "produtos_delete_own"
  on produtos for delete using (owner_id = auth.uid());

-- produto_insumos
create policy "produto_insumos_select_own"
  on produto_insumos for select using (owner_id = auth.uid());
create policy "produto_insumos_insert_own"
  on produto_insumos for insert with check (owner_id = auth.uid());
create policy "produto_insumos_update_own"
  on produto_insumos for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "produto_insumos_delete_own"
  on produto_insumos for delete using (owner_id = auth.uid());
