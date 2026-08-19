import { dataDeISO, formatarHora } from './format'

// Normaliza um telefone brasileiro para o formato exigido pelo wa.me:
// só dígitos, com DDI 55. Aceita entradas como "(11) 91234-5678",
// "11912345678", "+55 11 91234-5678". Devolve null se claramente inválido.
export function normalizarTelefoneBR(telefone) {
  if (!telefone) return null
  let d = String(telefone).replace(/\D/g, '')
  if (!d) return null
  // remove zeros à esquerda (ex.: DDD digitado como 011)
  d = d.replace(/^0+/, '')
  // já veio com DDI 55 + DDD (10 ou 11 dígitos nacionais)
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) return d
  // número nacional com DDD (fixo 10, celular 11)
  if (d.length === 10 || d.length === 11) return '55' + d
  return null
}

const CAPITALIZAR = (s) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : s

// Monta a mensagem de lembrete/confirmação assinada pela barbearia.
export function mensagemLembrete({ clienteNome, barbeariaNome, dataISO, hora, servicoNome }) {
  const primeiroNome = (clienteNome || '').trim().split(/\s+/)[0] || 'tudo bem'
  const diaSemana = CAPITALIZAR(
    dataDeISO(dataISO).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })
  )
  const horas = formatarHora(hora)
  const servico = servicoNome ? ` (${servicoNome})` : ''
  return (
    `Fala ${primeiroNome}! 💈\n` +
    `Passando pra confirmar seu horário na ${barbeariaNome || 'barbearia'}: ` +
    `${diaSemana} às ${horas}${servico}.\n` +
    `Se precisar remarcar, é só me chamar por aqui. Até lá!`
  )
}

// Link wa.me pronto pra abrir o WhatsApp já com a mensagem escrita.
// Se não houver telefone válido, devolve link do WhatsApp com o texto
// (o barbeiro escolhe o contato) — nunca quebra.
export function linkWhatsApp({ telefone, mensagem }) {
  const numero = normalizarTelefoneBR(telefone)
  const texto = encodeURIComponent(mensagem || '')
  return numero
    ? `https://wa.me/${numero}?text=${texto}`
    : `https://wa.me/?text=${texto}`
}
