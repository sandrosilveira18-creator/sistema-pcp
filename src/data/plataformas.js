import { supabase } from '../lib/supabaseClient'

export async function listarPlataformas({ apenasAtivas } = {}) {
  let query = supabase.from('plataformas').select('*').order('nome', { ascending: true })
  if (apenasAtivas) query = query.eq('ativo', true)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function criarPlataforma(payload) {
  const { data, error } = await supabase.from('plataformas').insert(payload).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function atualizarPlataforma(id, payload) {
  const { data, error } = await supabase.from('plataformas').update(payload).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function excluirPlataforma(id) {
  const { error } = await supabase.from('plataformas').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
