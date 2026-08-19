// Traduz erros técnicos (Postgres / Supabase Auth / rede) em mensagens
// curtas e claras pro barbeiro. Recebe o objeto de erro inteiro (que pode
// ter .code do Postgres) e devolve uma string amigável.
export function mensagemErro(error) {
  const msg = (error && (error.message || error.error_description)) || String(error || 'Algo deu errado.')
  const code = error?.code || ''
  const low = String(msg).toLowerCase()

  // Conflito de horário (índice único parcial uidx_agendamentos_slot)
  if (code === '23505' || low.includes('uidx_agendamentos_slot') || low.includes('duplicate key')) {
    return 'Já tem um cliente marcado nesse horário. Escolha outro horário.'
  }
  // Violação de regra (status/preço/duração inválidos)
  if (code === '23514' || low.includes('check constraint')) {
    return 'Dados inválidos. Confira os campos e tente de novo.'
  }
  // Login / cadastro
  if (low.includes('invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (low.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.'
  if (low.includes('already registered')) return 'Esse e-mail já tem conta. É só entrar.'
  if (low.includes('password should be at least') || low.includes('at least 6')) {
    return 'A senha precisa ter pelo menos 6 caracteres.'
  }
  // Sem internet
  if (low.includes('failed to fetch') || low.includes('networkerror') || low.includes('load failed')) {
    return 'Sem conexão. Verifique a internet e tente de novo.'
  }
  return msg
}
