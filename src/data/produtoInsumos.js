import { supabase } from '../lib/supabaseClient'

// Ficha técnica completa (item a item, custo já calculado pela view —
// fonte única de verdade). Lançará erro legível se a function SQL detectar
// unidade incompatível em algum item já existente.
export async function listarFichaTecnica(produtoId) {
  const { data, error } = await supabase
    .from('vw_produto_ficha')
    .select('*')
    .eq('produto_id', produtoId)
    .order('item_id', { ascending: true })
  if (error) throw new Error(error.message)
  return data
}

export async function adicionarItemReceita({ produto_id, insumo_id, quantidade_uso, unidade_uso_id, fator_perda }) {
  const { data, error } = await supabase
    .from('produto_insumos')
    .insert({ produto_id, insumo_id, quantidade_uso, unidade_uso_id, fator_perda: fator_perda ?? 0 })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function atualizarItemReceita(id, payload) {
  const { data, error } = await supabase.from('produto_insumos').update(payload).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function removerItemReceita(id) {
  const { error } = await supabase.from('produto_insumos').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
