import { supabase } from '../lib/supabaseClient'
import { mensagemErro } from '../utils/erros'

export async function listarServicos({ apenasAtivos = false } = {}) {
  let query = supabase.from('servicos').select('*').order('nome', { ascending: true })
  if (apenasAtivos) query = query.eq('ativo', true)
  const { data, error } = await query
  if (error) throw new Error(mensagemErro(error))
  return data
}

export async function criarServico(payload) {
  const { data, error } = await supabase.from('servicos').insert(payload).select().single()
  if (error) throw new Error(mensagemErro(error))
  return data
}

export async function atualizarServico(id, payload) {
  const { data, error } = await supabase.from('servicos').update(payload).eq('id', id).select().single()
  if (error) throw new Error(mensagemErro(error))
  return data
}

export async function excluirServico(id) {
  const { error } = await supabase.from('servicos').delete().eq('id', id)
  if (error) throw new Error(mensagemErro(error))
}
