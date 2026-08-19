export function formatarBRL(valor) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

// 'YYYY-MM-DD' -> 'DD/MM'
export function formatarDataCurta(iso) {
  if (!iso) return ''
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}`
}

// 'YYYY-MM-DD' -> 'segunda-feira, 19 de agosto'
export function formatarDataLonga(iso) {
  if (!iso) return ''
  const d = dataDeISO(iso)
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}

// 'HH:MM:SS' ou 'HH:MM' -> 'HH:MM'
export function formatarHora(hora) {
  if (!hora) return ''
  return hora.slice(0, 5)
}

// Data local (sem fuso UTC bagunçando o dia) a partir de 'YYYY-MM-DD'.
export function dataDeISO(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number)
  return new Date(ano, mes - 1, dia)
}

// Date -> 'YYYY-MM-DD' no fuso local.
export function isoDeData(d) {
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

// Hoje em 'YYYY-MM-DD' local.
export function hojeISO() {
  return isoDeData(new Date())
}

// Soma dias a uma data ISO e devolve ISO.
export function somarDias(iso, dias) {
  const d = dataDeISO(iso)
  d.setDate(d.getDate() + dias)
  return isoDeData(d)
}
