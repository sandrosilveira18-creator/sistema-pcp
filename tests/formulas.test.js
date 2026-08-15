import { describe, it, expect } from 'vitest'
import {
  fnCustoBase,
  fnCustoItem,
  validarDimensao,
  custoTotalProduto,
  precoAlvo,
  precoPlataforma,
  markupEfetivo,
} from '../src/utils/calculo'
import { precoPsicologico, formatarBRL } from '../src/utils/format'

describe('fnCustoBase — custo por unidade base do insumo', () => {
  it('alface: pacote de 1kg por R$ 8,00 -> R$ 0,008 por grama', () => {
    expect(
      fnCustoBase({ preco_compra: 8, quantidade_compra: 1, fator_base_unidade_compra: 1000 })
    ).toBeCloseTo(0.008, 6)
  })
})

describe('fnCustoItem — custo de um item de receita', () => {
  it('100g de alface a R$ 0,008/g -> R$ 0,80', () => {
    const custoBase = fnCustoBase({ preco_compra: 8, quantidade_compra: 1, fator_base_unidade_compra: 1000 })
    const custoItem = fnCustoItem({ quantidade_uso: 100, fator_base_unidade_uso: 1, custo_base: custoBase })
    expect(custoItem).toBeCloseTo(0.8, 6)
  })

  it('aplica o fator de perda/desperdício sobre o custo do item', () => {
    const custoBase = fnCustoBase({ preco_compra: 8, quantidade_compra: 1, fator_base_unidade_compra: 1000 })
    const custoItem = fnCustoItem({
      quantidade_uso: 100,
      fator_base_unidade_uso: 1,
      custo_base: custoBase,
      fator_perda: 0.1, // 10% de perda
    })
    expect(custoItem).toBeCloseTo(0.88, 6)
  })
})

describe('validarDimensao — bloqueio de unidade incompatível', () => {
  it('não lança quando as dimensões batem', () => {
    expect(() =>
      validarDimensao({ dimensao_compra: 'massa', dimensao_uso: 'massa', nome_insumo: 'Alface' })
    ).not.toThrow()
  })

  it('lança erro claro quando insumo comprado em volume é usado em massa', () => {
    expect(() =>
      validarDimensao({ dimensao_compra: 'volume', dimensao_uso: 'massa', nome_insumo: 'Leite' })
    ).toThrow(/Unidade incompatível/)
  })
})

describe('Caso obrigatório do prompt: custo 5 -> alvo 6 -> iFood 7,50', () => {
  it('markup_custo de 20% sobre custo 5,00 -> preço-alvo 6,00', () => {
    const alvo = precoAlvo({ custo_total: 5, margem_tipo: 'markup_custo', margem_valor: 0.2 })
    expect(alvo).toBeCloseTo(6, 6)
  })

  it('iFood a 20% sobre alvo 6,00 -> preço sugerido 7,50 (dividir, nunca somar)', () => {
    const preco = precoPlataforma({ preco_alvo: 6, taxa_percentual: 0.2, taxa_fixa: 0 })
    expect(preco).toBeCloseTo(7.5, 6)
    // confirma que o dono recebe exatamente o alvo líquido após a taxa
    const retidoPelaPlataforma = preco * 0.2
    expect(preco - retidoPelaPlataforma).toBeCloseTo(6, 6)
  })

  it('NÃO é equivalente a somar 20% ao alvo (isso daria 7,20 e um recebido de só 5,76)', () => {
    const somaErrada = 6 * 1.2
    expect(somaErrada).toBeCloseTo(7.2, 6)
    expect(somaErrada).not.toBeCloseTo(7.5, 1)
  })
})

describe('margem_venda — margem sobre o preço de venda', () => {
  it('custo 5,00, margem 20% sobre venda -> alvo 6,25', () => {
    const alvo = precoAlvo({ custo_total: 5, margem_tipo: 'margem_venda', margem_valor: 0.2 })
    expect(alvo).toBeCloseTo(6.25, 6)
  })
})

describe('custoTotalProduto', () => {
  it('soma itens + embalagem + operacional', () => {
    const total = custoTotalProduto({
      itens: [{ custo_item: 0.8 }, { custo_item: 1.2 }],
      custo_embalagem: 0.5,
      custo_operacional: 0.3,
    })
    expect(total).toBeCloseTo(2.8, 6)
  })

  it('produto sem receita e sem custos extras -> custo total 0 (sinalizar na UI, nunca vender por 0)', () => {
    const total = custoTotalProduto({ itens: [], custo_embalagem: 0, custo_operacional: 0 })
    expect(total).toBe(0)
  })
})

describe('markupEfetivo', () => {
  it('retorna null quando custo_total é zero (evita divisão por zero)', () => {
    expect(markupEfetivo({ preco: 10, custo_total: 0 })).toBeNull()
  })

  it('calcula o markup efetivo corretamente com override manual', () => {
    expect(markupEfetivo({ preco: 7, custo_total: 5 })).toBeCloseTo(0.4, 6)
  })
})

describe('precoPlataforma — taxa alta e taxa fixa', () => {
  it('taxa fixa soma antes de dividir pelo percentual', () => {
    const preco = precoPlataforma({ preco_alvo: 6, taxa_percentual: 0.2, taxa_fixa: 1 })
    expect(preco).toBeCloseTo((6 + 1) / 0.8, 6)
  })

  it('lança erro para taxa_percentual >= 1 (evita divisão por zero/negativa)', () => {
    expect(() => precoPlataforma({ preco_alvo: 6, taxa_percentual: 1 })).toThrow()
  })
})

describe('precoPsicologico', () => {
  it('7,50 -> 7,90 (arredonda para cima, nunca reduz a margem)', () => {
    expect(precoPsicologico(7.5)).toBeCloseTo(7.9, 6)
  })

  it('7,90 exato permanece 7,90', () => {
    expect(precoPsicologico(7.9)).toBeCloseTo(7.9, 6)
  })

  it('7,95 sobe para 8,90 (próximo X,90 acima do valor)', () => {
    expect(precoPsicologico(7.95)).toBeCloseTo(8.9, 6)
  })

  it('retorna null para valor zero ou negativo', () => {
    expect(precoPsicologico(0)).toBeNull()
    expect(precoPsicologico(-3)).toBeNull()
  })
})

describe('formatarBRL', () => {
  it('formata valores em Real', () => {
    expect(formatarBRL(7.5)).toContain('7,50')
  })

  it('retorna traço para valores nulos/indefinidos', () => {
    expect(formatarBRL(null)).toBe('—')
    expect(formatarBRL(undefined)).toBe('—')
  })
})
