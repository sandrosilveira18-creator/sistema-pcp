-- ============================================================================
-- Seed de exemplo — X-Salada, X-Bacon e Refrigerante Lata
-- Rode no SQL Editor do Supabase DEPOIS das migrations 0001 e 0002.
-- Idempotente: pode rodar mais de uma vez sem duplicar linhas.
--
-- Vincula tudo ao usuário sandro.silveira1509@gmail.com (RLS exige owner_id).
-- Se esse usuário ainda não existir (cadastro feito pela tela de login do
-- app), o script para com um erro claro em vez de inserir owner_id nulo.
-- ============================================================================

do $$
declare
  v_owner uuid;

  v_un_un int; v_un_kg int; v_un_g int;

  v_cat_padaria int; v_cat_proteinas int; v_cat_hortifruti int;
  v_cat_laticinios int; v_cat_bebidas_insumo int;
  v_cat_lanches int; v_cat_bebidas_produto int;

  v_ins_pao uuid; v_ins_carne uuid; v_ins_queijo uuid; v_ins_alface uuid;
  v_ins_tomate uuid; v_ins_molho uuid; v_ins_bacon uuid; v_ins_refri uuid;

  v_prod_xsalada uuid; v_prod_xbacon uuid; v_prod_refri uuid;
begin
  select id into v_owner from auth.users where email = 'sandro.silveira1509@gmail.com';
  if v_owner is null then
    raise exception 'Usuário sandro.silveira1509@gmail.com não encontrado em auth.users — cadastre-se primeiro pela tela de login do app.';
  end if;

  select id into v_un_un from unidades_medida where sigla = 'un';
  select id into v_un_kg from unidades_medida where sigla = 'kg';
  select id into v_un_g  from unidades_medida where sigla = 'g';

  -- ---------------------------------------------------------------------
  -- Categorias
  -- ---------------------------------------------------------------------
  insert into categorias (owner_id, nome, tipo)
    select v_owner, 'Padaria', 'insumo'
    where not exists (select 1 from categorias where owner_id = v_owner and nome = 'Padaria' and tipo = 'insumo');
  insert into categorias (owner_id, nome, tipo)
    select v_owner, 'Proteínas', 'insumo'
    where not exists (select 1 from categorias where owner_id = v_owner and nome = 'Proteínas' and tipo = 'insumo');
  insert into categorias (owner_id, nome, tipo)
    select v_owner, 'Hortifruti', 'insumo'
    where not exists (select 1 from categorias where owner_id = v_owner and nome = 'Hortifruti' and tipo = 'insumo');
  insert into categorias (owner_id, nome, tipo)
    select v_owner, 'Laticínios e Molhos', 'insumo'
    where not exists (select 1 from categorias where owner_id = v_owner and nome = 'Laticínios e Molhos' and tipo = 'insumo');
  insert into categorias (owner_id, nome, tipo)
    select v_owner, 'Bebidas', 'insumo'
    where not exists (select 1 from categorias where owner_id = v_owner and nome = 'Bebidas' and tipo = 'insumo');
  insert into categorias (owner_id, nome, tipo)
    select v_owner, 'Lanches', 'produto'
    where not exists (select 1 from categorias where owner_id = v_owner and nome = 'Lanches' and tipo = 'produto');
  insert into categorias (owner_id, nome, tipo)
    select v_owner, 'Bebidas', 'produto'
    where not exists (select 1 from categorias where owner_id = v_owner and nome = 'Bebidas' and tipo = 'produto');

  select id into v_cat_padaria from categorias where owner_id = v_owner and nome = 'Padaria' and tipo = 'insumo';
  select id into v_cat_proteinas from categorias where owner_id = v_owner and nome = 'Proteínas' and tipo = 'insumo';
  select id into v_cat_hortifruti from categorias where owner_id = v_owner and nome = 'Hortifruti' and tipo = 'insumo';
  select id into v_cat_laticinios from categorias where owner_id = v_owner and nome = 'Laticínios e Molhos' and tipo = 'insumo';
  select id into v_cat_bebidas_insumo from categorias where owner_id = v_owner and nome = 'Bebidas' and tipo = 'insumo';
  select id into v_cat_lanches from categorias where owner_id = v_owner and nome = 'Lanches' and tipo = 'produto';
  select id into v_cat_bebidas_produto from categorias where owner_id = v_owner and nome = 'Bebidas' and tipo = 'produto';

  -- ---------------------------------------------------------------------
  -- Insumos (preços de compra realistas, ago/2026)
  -- ---------------------------------------------------------------------

  -- Pão de hambúrguer — pacote com 8 un por R$ 12,00 -> R$ 1,50/un
  insert into insumos (owner_id, nome, categoria_id, unidade_compra_id, quantidade_compra, preco_compra, estoque_atual, estoque_minimo)
    select v_owner, 'Pão de hambúrguer', v_cat_padaria, v_un_un, 8, 12.00, 40, 16
    where not exists (select 1 from insumos where owner_id = v_owner and nome = 'Pão de hambúrguer');

  -- Blend de carne bovina (80/20) — 1kg por R$ 32,00 -> R$ 0,032/g
  insert into insumos (owner_id, nome, categoria_id, unidade_compra_id, quantidade_compra, preco_compra, estoque_atual, estoque_minimo)
    select v_owner, 'Blend de carne bovina', v_cat_proteinas, v_un_kg, 1, 32.00, 5000, 2000
    where not exists (select 1 from insumos where owner_id = v_owner and nome = 'Blend de carne bovina');

  -- Bacon em fatias — 1kg por R$ 38,00 -> R$ 0,038/g
  insert into insumos (owner_id, nome, categoria_id, unidade_compra_id, quantidade_compra, preco_compra, estoque_atual, estoque_minimo)
    select v_owner, 'Bacon em fatias', v_cat_proteinas, v_un_kg, 1, 38.00, 1500, 500
    where not exists (select 1 from insumos where owner_id = v_owner and nome = 'Bacon em fatias');

  -- Queijo mussarela fatiado — 1kg por R$ 34,00 -> R$ 0,034/g
  insert into insumos (owner_id, nome, categoria_id, unidade_compra_id, quantidade_compra, preco_compra, estoque_atual, estoque_minimo)
    select v_owner, 'Queijo mussarela fatiado', v_cat_laticinios, v_un_kg, 1, 34.00, 2000, 500
    where not exists (select 1 from insumos where owner_id = v_owner and nome = 'Queijo mussarela fatiado');

  -- Alface americana — 1kg por R$ 8,00 -> R$ 0,008/g
  insert into insumos (owner_id, nome, categoria_id, unidade_compra_id, quantidade_compra, preco_compra, estoque_atual, estoque_minimo)
    select v_owner, 'Alface americana', v_cat_hortifruti, v_un_kg, 1, 8.00, 1000, 300
    where not exists (select 1 from insumos where owner_id = v_owner and nome = 'Alface americana');

  -- Tomate — 1kg por R$ 7,00 -> R$ 0,007/g
  insert into insumos (owner_id, nome, categoria_id, unidade_compra_id, quantidade_compra, preco_compra, estoque_atual, estoque_minimo)
    select v_owner, 'Tomate', v_cat_hortifruti, v_un_kg, 1, 7.00, 1500, 400
    where not exists (select 1 from insumos where owner_id = v_owner and nome = 'Tomate');

  -- Molho especial da casa — balde de 3,6kg por R$ 28,00 -> R$ 0,00778/g
  insert into insumos (owner_id, nome, categoria_id, unidade_compra_id, quantidade_compra, preco_compra, estoque_atual, estoque_minimo)
    select v_owner, 'Molho especial da casa', v_cat_laticinios, v_un_kg, 3.6, 28.00, 3600, 900
    where not exists (select 1 from insumos where owner_id = v_owner and nome = 'Molho especial da casa');

  -- Refrigerante lata 350ml — caixa com 12 un por R$ 36,00 -> R$ 3,00/un
  insert into insumos (owner_id, nome, categoria_id, unidade_compra_id, quantidade_compra, preco_compra, estoque_atual, estoque_minimo)
    select v_owner, 'Refrigerante lata 350ml', v_cat_bebidas_insumo, v_un_un, 12, 36.00, 48, 24
    where not exists (select 1 from insumos where owner_id = v_owner and nome = 'Refrigerante lata 350ml');

  select id into v_ins_pao from insumos where owner_id = v_owner and nome = 'Pão de hambúrguer';
  select id into v_ins_carne from insumos where owner_id = v_owner and nome = 'Blend de carne bovina';
  select id into v_ins_bacon from insumos where owner_id = v_owner and nome = 'Bacon em fatias';
  select id into v_ins_queijo from insumos where owner_id = v_owner and nome = 'Queijo mussarela fatiado';
  select id into v_ins_alface from insumos where owner_id = v_owner and nome = 'Alface americana';
  select id into v_ins_tomate from insumos where owner_id = v_owner and nome = 'Tomate';
  select id into v_ins_molho from insumos where owner_id = v_owner and nome = 'Molho especial da casa';
  select id into v_ins_refri from insumos where owner_id = v_owner and nome = 'Refrigerante lata 350ml';

  -- ---------------------------------------------------------------------
  -- Produtos
  -- ---------------------------------------------------------------------

  -- X-Salada: markup de 110% sobre o custo (agora permitido pela migration 0002)
  insert into produtos (owner_id, nome, categoria_id, margem_tipo, margem_valor, custo_embalagem, custo_operacional)
    select v_owner, 'X-Salada', v_cat_lanches, 'markup_custo', 1.10, 0.80, 0.50
    where not exists (select 1 from produtos where owner_id = v_owner and nome = 'X-Salada');

  -- X-Bacon: mesma margem do X-Salada
  insert into produtos (owner_id, nome, categoria_id, margem_tipo, margem_valor, custo_embalagem, custo_operacional)
    select v_owner, 'X-Bacon', v_cat_lanches, 'markup_custo', 1.10, 0.80, 0.50
    where not exists (select 1 from produtos where owner_id = v_owner and nome = 'X-Bacon');

  -- Refrigerante lata: margem sobre venda (55%) — modo mais comum para revenda de bebidas
  insert into produtos (owner_id, nome, categoria_id, margem_tipo, margem_valor, custo_embalagem, custo_operacional)
    select v_owner, 'Refrigerante Lata 350ml', v_cat_bebidas_produto, 'margem_venda', 0.55, 0, 0
    where not exists (select 1 from produtos where owner_id = v_owner and nome = 'Refrigerante Lata 350ml');

  select id into v_prod_xsalada from produtos where owner_id = v_owner and nome = 'X-Salada';
  select id into v_prod_xbacon from produtos where owner_id = v_owner and nome = 'X-Bacon';
  select id into v_prod_refri from produtos where owner_id = v_owner and nome = 'Refrigerante Lata 350ml';

  -- ---------------------------------------------------------------------
  -- Receitas (produto_insumos) — limpa e recria para rodar idempotente
  -- ---------------------------------------------------------------------
  delete from produto_insumos where produto_id in (v_prod_xsalada, v_prod_xbacon, v_prod_refri);

  -- X-Salada: pão + 150g de carne (5% de perda na chapa) + queijo + alface + tomate + molho
  insert into produto_insumos (owner_id, produto_id, insumo_id, quantidade_uso, unidade_uso_id, fator_perda) values
    (v_owner, v_prod_xsalada, v_ins_pao,    1,   v_un_un, 0),
    (v_owner, v_prod_xsalada, v_ins_carne,  150, v_un_g,  0.05),
    (v_owner, v_prod_xsalada, v_ins_queijo, 30,  v_un_g,  0),
    (v_owner, v_prod_xsalada, v_ins_alface, 20,  v_un_g,  0),
    (v_owner, v_prod_xsalada, v_ins_tomate, 25,  v_un_g,  0),
    (v_owner, v_prod_xsalada, v_ins_molho,  15,  v_un_g,  0);

  -- X-Bacon: pão + 150g de carne + queijo + bacon + molho (sem salada)
  insert into produto_insumos (owner_id, produto_id, insumo_id, quantidade_uso, unidade_uso_id, fator_perda) values
    (v_owner, v_prod_xbacon, v_ins_pao,    1,   v_un_un, 0),
    (v_owner, v_prod_xbacon, v_ins_carne,  150, v_un_g,  0.05),
    (v_owner, v_prod_xbacon, v_ins_queijo, 30,  v_un_g,  0),
    (v_owner, v_prod_xbacon, v_ins_bacon,  40,  v_un_g,  0.05),
    (v_owner, v_prod_xbacon, v_ins_molho,  15,  v_un_g,  0);

  -- Refrigerante: revenda direta, 1 lata
  insert into produto_insumos (owner_id, produto_id, insumo_id, quantidade_uso, unidade_uso_id, fator_perda) values
    (v_owner, v_prod_refri, v_ins_refri, 1, v_un_un, 0);

  raise notice 'Seed concluído para owner_id %', v_owner;
end $$;