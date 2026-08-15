export function formatarBRL(valor) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

export function formatarPercentual(valor) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(valor)
}

// Sugestão de preço "psicológico" (X,90), sempre arredondando PARA CIMA a
// partir do preço-alvo — nunca reduz o valor exato, então nunca corrói a
// margem calculada pelo banco. É só uma sugestão de exibição; o preço que
// vale para o cálculo de lucro continua sendo o preco_sugerido da view.
export function precoPsicologico(valor) {
  if (valor === null || valor === undefined || Number.isNaN(valor) || valor <= 0) return null
  const parteInteira = Math.floor(valor)
  let candidato = parteInteira + 0.9
  if (candidato < valor) candidato += 1
  return Math.round(candidato * 100) / 100
}
