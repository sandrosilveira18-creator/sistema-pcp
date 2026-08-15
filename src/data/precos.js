import { supabase } from '../lib/supabaseClient'

// Preço por produto x plataforma — TODO valor vem pronto do banco
// (vw_produto_precos). O frontend nunca refaz essa conta: só exibe.
export async function listarPrecosProduto(produtoId) {
  const { data, error } = await supabase
    .from('vw_produto_precos')
    .select('*')
    .eq('produto_id', produtoId)
    .order('plataforma', { ascending: true })
  if (error) throw new Error(error.message)
  return data
}

export async function listarCustoProduto(produtoId) {
  const { data, error } = await supabase
    .from('vw_produto_custo')
    .select('*')
    .eq('produto_id', produtoId)
    .single()
  if (error) throw new Error(error.message)
  return data
}
