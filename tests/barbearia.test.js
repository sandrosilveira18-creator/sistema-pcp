import { describe, it, expect } from 'vitest'
import { normalizarTelefoneBR, mensagemLembrete, linkWhatsApp } from '../src/utils/whatsapp'
import { resumoFinanceiro } from '../src/utils/financeiro'
import { somarDias, isoDeData, formatarHora, formatarDataCurta } from '../src/utils/format'

describe('normalizarTelefoneBR', () => {
  it('adiciona DDI 55 a celular com DDD', () => {
    expect(normalizarTelefoneBR('11912345678')).toBe('5511912345678')
  })
  it('aceita formatação livre com parênteses e traço', () => {
    expect(normalizarTelefoneBR('(11) 91234-5678')).toBe('5511912345678')
  })
  it('mantém número que já veio com 55', () => {
    expect(normalizarTelefoneBR('+55 11 91234-5678')).toBe('5511912345678')
  })
  it('remove zero à esquerda do DDD', () => {
    expect(normalizarTelefoneBR('011912345678')).toBe('5511912345678')
  })
  it('aceita fixo de 10 dígitos', () => {
    expect(normalizarTelefoneBR('1133334444')).toBe('551133334444')
  })
  it('devolve null para vazio ou claramente inválido', () => {
    expect(normalizarTelefoneBR('')).toBeNull()
    expect(normalizarTelefoneBR(null)).toBeNull()
    expect(normalizarTelefoneBR('123')).toBeNull()
  })
})

describe('mensagemLembrete', () => {
  it('usa o primeiro nome do cliente e o nome da barbearia', () => {
    const msg = mensagemLembrete({
      clienteNome: 'João Pedro Silva',
      barbeariaNome: 'Alemão do Corte',
      dataISO: '2026-08-20',
      hora: '14:30:00',
      servicoNome: 'Corte + Barba',
    })
    expect(msg).toContain('João')
    expect(msg).not.toContain('Pedro')
    expect(msg).toContain('Alemão do Corte')
    expect(msg).toContain('14:30')
    expect(msg).toContain('Corte + Barba')
  })
})

describe('linkWhatsApp', () => {
  it('monta wa.me com número normalizado e texto codificado', () => {
    const link = linkWhatsApp({ telefone: '(11) 91234-5678', mensagem: 'Olá João' })
    expect(link).toBe('https://wa.me/5511912345678?text=' + encodeURIComponent('Olá João'))
  })
  it('sem telefone, cai no wa.me genérico só com o texto', () => {
    const link = linkWhatsApp({ telefone: '', mensagem: 'oi' })
    expect(link).toBe('https://wa.me/?text=oi')
  })
})

describe('resumoFinanceiro', () => {
  const dados = [
    { status: 'atendido', servico_nome: 'Corte', preco: 35 },
    { status: 'atendido', servico_nome: 'Corte', preco: 35 },
    { status: 'atendido', servico_nome: 'Barba', preco: 25 },
    { status: 'faltou', servico_nome: 'Corte', preco: 35 },
    { status: 'agendado', servico_nome: 'Corte', preco: 35 },
    { status: 'cancelado', servico_nome: 'Barba', preco: 25 },
  ]

  it('soma apenas os atendidos no total', () => {
    const r = resumoFinanceiro(dados)
    expect(r.total).toBe(95) // 35 + 35 + 25
    expect(r.quantidadeAtendidos).toBe(3)
  })
  it('conta faltas separadamente', () => {
    expect(resumoFinanceiro(dados).faltas).toBe(1)
  })
  it('calcula ticket médio dos atendidos', () => {
    expect(resumoFinanceiro(dados).ticketMedio).toBeCloseTo(95 / 3, 5)
  })
  it('agrupa por serviço ordenado por total desc', () => {
    const r = resumoFinanceiro(dados)
    expect(r.porServico[0]).toEqual({ servico: 'Corte', quantidade: 2, total: 70 })
    expect(r.porServico[1]).toEqual({ servico: 'Barba', quantidade: 1, total: 25 })
  })
  it('não quebra com lista vazia', () => {
    const r = resumoFinanceiro([])
    expect(r).toEqual({ total: 0, quantidadeAtendidos: 0, faltas: 0, ticketMedio: 0, porServico: [] })
  })
})

describe('datas locais', () => {
  it('somarDias respeita virada de mês sem bug de fuso', () => {
    expect(somarDias('2026-08-31', 1)).toBe('2026-09-01')
    expect(somarDias('2026-01-01', -1)).toBe('2025-12-31')
  })
  it('isoDeData formata com zero à esquerda', () => {
    expect(isoDeData(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
  it('formatarHora corta os segundos', () => {
    expect(formatarHora('09:05:00')).toBe('09:05')
  })
  it('formatarDataCurta vira DD/MM', () => {
    expect(formatarDataCurta('2026-08-20')).toBe('20/08')
  })
})
