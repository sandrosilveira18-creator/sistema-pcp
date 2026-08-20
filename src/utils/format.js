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

// Diferença de dias inteiros entre duas datas ISO (b - a), no fuso local.
export function diasEntre(isoA, isoB) {
  const MS = 86400000
  return Math.round((dataDeISO(isoB) - dataDeISO(isoA)) / MS)
}

// Texto amigável de "quando foi a última visita" a partir de 'YYYY-MM-DD'.
// Ex.: 'hoje', 'ontem', 'há 5 dias', 'há 3 meses'. Sem visita -> 'nunca veio'.
export function tempoDesde(iso, hoje = hojeISO()) {
  if (!iso) return 'nunca veio'
  const dias = diasEntre(iso, hoje)
  if (dias <= 0) return 'hoje'
  if (dias === 1) return 'ontem'
  if (dias < 30) return `há ${dias} dias`
  const meses = Math.floor(dias / 30)
  if (meses === 1) return 'há 1 mês'
  if (meses < 12) return `há ${meses} meses`
  const anos = Math.floor(dias / 365)
  return anos === 1 ? 'há 1 ano' : `há ${anos} anos`
}
