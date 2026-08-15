import { supabase } from '../lib/supabaseClient'

export async function listarCategorias(tipo) {
  let query = supabase.from('categorias').select('*').order('nome', { ascending: true })
  if (tipo) query = query.eq('tipo', tipo)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function criarCategoria({ nome, tipo }) {
  const { data, error } = await supabase.from('categorias').insert({ nome, tipo }).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function excluirCategoria(id) {
  const { error } = await supabase.from('categorias').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
