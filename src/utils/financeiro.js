// Resumo financeiro de um conjunto de agendamentos (normalmente de um dia).
// Só o que foi "atendido" entra no faturamento. Função pura -> testável.
export function resumoFinanceiro(agendamentos = []) {
  const atendidos = agendamentos.filter((a) => a.status === 'atendido')
  const faltas = agendamentos.filter((a) => a.status === 'faltou').length

  const total = atendidos.reduce((s, a) => s + Number(a.preco || 0), 0)

  const porServicoMap = new Map()
  for (const a of atendidos) {
    const chave = a.servico_nome || 'Outros'
    const atual = porServicoMap.get(chave) || { servico: chave, quantidade: 0, total: 0 }
    atual.quantidade += 1
    atual.total += Number(a.preco || 0)
    porServicoMap.set(chave, atual)
  }
  const porServico = [...porServicoMap.values()].sort((a, b) => b.total - a.total)

  const ticketMedio = atendidos.length ? total / atendidos.length : 0

  return {
    total,
    quantidadeAtendidos: atendidos.length,
    faltas,
    ticketMedio,
    porServico,
  }
}
