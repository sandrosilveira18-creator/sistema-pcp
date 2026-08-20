import { supabase } from '../lib/supabaseClient'
import { mensagemErro } from '../utils/erros'

// Lista clientes com o resumo (visitas, última visita, total gasto), já
// juntando a view vw_cliente_resumo. Aceita busca por nome.
export async function listarClientes({ busca } = {}) {
  let query = supabase
    .from('clientes')
    .select('*, resumo:vw_cliente_resumo(visitas, ultima_visita, total_gasto)')
    .order('nome', { ascending: true })
  if (busca) query = query.ilike('nome', `%${busca}%`)
  const { data, error } = await query
  if (error) throw new Error(mensagemErro(error))
  // resumo vem como array (relação) — achata para objeto único.
  return (data || []).map((c) => ({
    ...c,
    resumo: Array.isArray(c.resumo) ? c.resumo[0] : c.resumo,
  }))
}

export async function buscarCliente(id) {
  const { data, error } = await supabase
    .from('clientes')
    .select('*, resumo:vw_cliente_resumo(visitas, ultima_visita, total_gasto)')
    .eq('id', id)
    .single()
  if (error) throw new Error(mensagemErro(error))
  return { ...data, resumo: Array.isArray(data.resumo) ? data.resumo[0] : data.resumo }
}

export async function criarCliente(payload) {
  const { data, error } = await supabase.from('clientes').insert(payload).select().single()
  if (error) throw new Error(mensagemErro(error))
  return data
}

export async function atualizarCliente(id, payload) {
  const { data, error } = await supabase.from('clientes').update(payload).eq('id', id).select().single()
  if (error) throw new Error(mensagemErro(error))
  return data
}

export async function excluirCliente(id) {
  const { error } = await supabase.from('clientes').delete().eq('id', id)
  if (error) throw new Error(mensagemErro(error))
}

// Histórico de atendimentos de um cliente (mais recentes primeiro).
export async function historicoCliente(clienteId) {
  const { data, error } = await supabase
    .from('agendamentos')
    .select('id, data, hora, servico_nome, preco, status')
    .eq('cliente_id', clienteId)
    .order('data', { ascending: false })
    .order('hora', { ascending: false })
  if (error) throw new Error(mensagemErro(error))
  return data
}

// Busca rápida para o autocomplete no agendamento (nome + telefone).
export async function buscarClientesRapido(termo) {
  if (!termo || termo.trim().length < 2) return []
  const { data, error } = await supabase
    .from('clientes')
    .select('id, nome, telefone')
    .ilike('nome', `%${termo.trim()}%`)
    .order('nome', { ascending: true })
    .limit(6)
  if (error) throw new Error(mensagemErro(error))
  return data
}
