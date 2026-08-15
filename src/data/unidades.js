import { supabase } from '../lib/supabaseClient'

// Dado de referência global (leitura pública, sem owner_id).
export async function listarUnidades() {
  const { data, error } = await supabase
    .from('unidades_medida')
    .select('*')
    .order('dimensao', { ascending: true })
    .order('fator_base', { ascending: true })
  if (error) throw new Error(error.message)
  return data
}

export function unidadesPorDimensao(unidades, dimensao) {
  return unidades.filter((u) => u.dimensao === dimensao)
}
