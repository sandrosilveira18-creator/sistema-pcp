-- ============================================================================
-- Ajusta a constraint de produtos.margem_valor.
--
-- A constraint original (`check (margem_valor >= 0 and margem_valor < 1)`)
-- faz sentido para o modo 'margem_venda' (é uma fração do preço de venda,
-- matematicamente tem que ser < 100% para não dividir por zero/negativo).
-- Mas para o modo 'markup_custo' ela travava o markup em no máximo 99% —
-- em food service é comum markup de 150%-200% sobre o custo (ex.: um
-- hambúrguer que custa R$ 8 sendo vendido a R$ 20+). A regra agora é
-- condicional ao margem_tipo da própria linha.
-- ============================================================================

alter table produtos drop constraint if exists produtos_margem_valor_check;

alter table produtos add constraint produtos_margem_valor_check check (
  (margem_tipo = 'margem_venda' and margem_valor >= 0 and margem_valor < 1)
  or
  (margem_tipo = 'markup_custo' and margem_valor >= 0)
);