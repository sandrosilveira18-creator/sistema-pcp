import { supabase } from '../lib/supabaseClient'
import { mensagemErro } from '../utils/erros'

// Lista clientes com o resumo (visitas, última visita, total gasto). Como o
// resumo vem de uma view agregada (que o PostgREST não embuti automaticamente),
// buscamos os clientes e os resumos em duas consultas e juntamos aqui.
export async function listarClientes({ busca } = {}) {
  let query = supabase.from('clientes').select('*').order('nome', { ascending: true })
  if (busca) query = query.ilike('nome', `%${busca}%`)
  const { data: clientes, error } = await query
  if (error) throw new Error(mensagemErro(error))

  const ids = (clientes || []).map((c) => c.id)
  const mapaResumo = new Map()
  if (ids.length) {
    const { data: resumos, error: e2 } = await supabase
      .from('vw_cliente_resumo')
      .select('cliente_id, visitas, ultima_visita, total_gasto')
      .in('cliente_id', ids)
    if (e2) throw new Error(mensagemErro(e2))
    for (const r of resumos || []) mapaResumo.set(r.cliente_id, r)
  }
  return (clientes || []).map((c) => ({ ...c, resumo: mapaResumo.get(c.id) || null }))
}

export async function buscarCliente(id) {
  const { data, error } = await supabase.from('clientes').select('*').eq('id', id).single()
  if (error) throw new Error(mensagemErro(error))
  const { data: resumo } = await supabase
    .from('vw_cliente_resumo')
    .select('visitas, ultima_visita, total_gasto')
    .eq('cliente_id', id)
    .maybeSingle()
  return { ...data, resumo: resumo || null }
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
