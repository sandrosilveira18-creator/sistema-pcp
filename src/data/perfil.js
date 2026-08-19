import { supabase } from '../lib/supabaseClient'
import { mensagemErro } from '../utils/erros'

// O perfil é criado por trigger no signup. Buscamos com maybeSingle para não
// quebrar caso ainda não exista (ex.: usuário antigo antes do trigger).
export async function buscarPerfil() {
  const { data, error } = await supabase.from('perfil').select('*').maybeSingle()
  if (error) throw new Error(mensagemErro(error))
  return data
}

export async function atualizarPerfil(payload) {
  const { data: userData } = await supabase.auth.getUser()
  const ownerId = userData?.user?.id
  const registro = { ...payload, owner_id: ownerId, atualizado_em: new Date().toISOString() }
  // upsert cobre o caso de o perfil ainda não existir.
  const { data, error } = await supabase
    .from('perfil')
    .upsert(registro, { onConflict: 'owner_id' })
    .select()
    .single()
  if (error) throw new Error(mensagemErro(error))
  return data
}
