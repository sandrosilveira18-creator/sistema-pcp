import { supabase } from '../lib/supabaseClient'

export async function listarInsumos({ busca, apenasAtivos } = {}) {
  let query = supabase
    .from('insumos')
    .select('*, unidade_compra:unidades_medida(id, nome, sigla, dimensao, fator_base), categoria:categorias(id, nome)')
    .order('nome', { ascending: true })
  if (busca) query = query.ilike('nome', `%${busca}%`)
  if (apenasAtivos) query = query.eq('ativo', true)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function buscarInsumo(id) {
  const { data, error } = await supabase
    .from('insumos')
    .select('*, unidade_compra:unidades_medida(id, nome, sigla, dimensao, fator_base), categoria:categorias(id, nome)')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function criarInsumo(payload) {
  const { data, error } = await supabase.from('insumos').insert(payload).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function atualizarInsumo(id, payload) {
  const { data, error } = await supabase.from('insumos').update(payload).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function excluirInsumo(id) {
  const { error } = await supabase.from('insumos').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
