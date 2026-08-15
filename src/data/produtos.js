import { supabase } from '../lib/supabaseClient'

export async function listarProdutos({ busca, apenasAtivos } = {}) {
  let query = supabase
    .from('produtos')
    .select('*, categoria:categorias(id, nome)')
    .order('nome', { ascending: true })
  if (busca) query = query.ilike('nome', `%${busca}%`)
  if (apenasAtivos) query = query.eq('ativo', true)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function buscarProduto(id) {
  const { data, error } = await supabase
    .from('produtos')
    .select('*, categoria:categorias(id, nome)')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function criarProduto(payload) {
  const { data, error } = await supabase.from('produtos').insert(payload).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function atualizarProduto(id, payload) {
  const { data, error } = await supabase.from('produtos').update(payload).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function excluirProduto(id) {
  const { error } = await supabase.from('produtos').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
