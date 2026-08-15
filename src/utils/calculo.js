// Espelho em JS puro das fórmulas do §3/§4 do prompt e das functions SQL
// (fn_custo_base, fn_custo_item) e views (vw_produto_preco_alvo,
// vw_produto_precos). Usado SOMENTE para feedback imediato na UI antes de
// salvar (ex.: "custo por g" ao digitar preço/quantidade de um insumo, ou
// pré-visualização de margem ao mexer no slider). O valor que efetivamente
// vale — e é gravado/exibido após salvar — sempre vem das views do banco
// (fonte única de verdade, ver src/data/precos.js). Os testes em
// tests/formulas.test.js garantem que este espelho bate com a SQL.

export function fnCustoBase({ preco_compra, quantidade_compra, fator_base_unidade_compra }) {
  if (quantidade_compra <= 0 || fator_base_unidade_compra <= 0) return 0
  return preco_compra / (quantidade_compra * fator_base_unidade_compra)
}

export function validarDimensao({ dimensao_compra, dimensao_uso, nome_insumo }) {
  if (dimensao_compra !== dimensao_uso) {
    throw new Error(
      `Unidade incompatível: insumo ${nome_insumo} comprado em dimensão ${dimensao_compra} mas usado em dimensão ${dimensao_uso}`
    )
  }
}

export function fnCustoItem({ quantidade_uso, fator_base_unidade_uso, custo_base, fator_perda = 0 }) {
  const qtdBase = quantidade_uso * fator_base_unidade_uso
  return qtdBase * custo_base * (1 + fator_perda)
}

export function custoTotalProduto({ itens = [], custo_embalagem = 0, custo_operacional = 0 }) {
  const somaItens = itens.reduce((acc, item) => acc + item.custo_item, 0)
  return somaItens + custo_embalagem + custo_operacional
}

export function precoAlvo({ custo_total, margem_tipo, margem_valor }) {
  if (margem_tipo === 'markup_custo') return custo_total * (1 + margem_valor)
  if (margem_tipo === 'margem_venda') {
    if (margem_valor >= 1) throw new Error('margem_valor deve ser menor que 1 (100%) para margem sobre venda')
    return custo_total / (1 - margem_valor)
  }
  throw new Error(`margem_tipo desconhecido: ${margem_tipo}`)
}

export function precoPlataforma({ preco_alvo, taxa_percentual, taxa_fixa = 0 }) {
  if (taxa_percentual >= 1) throw new Error('taxa_percentual deve ser menor que 1 (100%)')
  return (preco_alvo + taxa_fixa) / (1 - taxa_percentual)
}

export function markupEfetivo({ preco, custo_total }) {
  if (!custo_total || custo_total <= 0) return null
  return (preco - custo_total) / custo_total
}
