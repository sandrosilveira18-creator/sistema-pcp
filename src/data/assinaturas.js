import { supabase } from '../lib/supabaseClient'
import { mensagemErro } from '../utils/erros'
import { criarCliente } from './clientes'

// Busca a assinatura (não-cancelada) de um cliente titular, com dependentes
// e o uso do mês. Devolve null se o cliente não é assinante.
export async function assinaturaDoCliente(clienteId) {
  const { data: assinatura, error } = await supabase
    .from('assinaturas')
    .select('*')
    .eq('cliente_id', clienteId)
    .neq('status', 'cancelada')
    .maybeSingle()
  if (error) throw new Error(mensagemErro(error))
  if (!assinatura) return null

  const [{ data: deps }, { data: uso }] = await Promise.all([
    supabase
      .from('assinatura_dependentes')
      .select('id, cliente_id, cliente:clientes(nome)')
      .eq('assinatura_id', assinatura.id),
    supabase
      .from('vw_assinatura_uso')
      .select('usados_mes')
      .eq('assinatura_id', assinatura.id)
      .maybeSingle(),
  ])

  const dependentes = (deps || []).map((d) => ({
    id: d.id,
    cliente_id: d.cliente_id,
    nome: Array.isArray(d.cliente) ? d.cliente[0]?.nome : d.cliente?.nome,
  }))
  return {
    ...assinatura,
    dependentes,
    usados_mes: uso?.usados_mes ?? 0,
    restantes: Math.max(0, assinatura.cortes_inclusos - (uso?.usados_mes ?? 0)),
  }
}

export async function criarAssinatura({ clienteId, plano_nome, cortes_inclusos, valor }) {
  const { data, error } = await supabase
    .from('assinaturas')
    .insert({
      cliente_id: clienteId,
      plano_nome: plano_nome || 'Mensal',
      cortes_inclusos: Number(cortes_inclusos) || 0,
      valor: Number(valor) || 0,
    })
    .select()
    .single()
  if (error) throw new Error(mensagemErro(error))
  return data
}

export async function atualizarAssinatura(id, payload) {
  const { data, error } = await supabase
    .from('assinaturas')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(mensagemErro(error))
  return data
}

// Cancelar = manter histórico mas liberar o cliente pra nova assinatura.
export async function cancelarAssinatura(id) {
  return atualizarAssinatura(id, { status: 'cancelada' })
}

// Adiciona um dependente pelo nome: cria (ou reutiliza) a ficha do cliente e
// vincula à assinatura. Assim os cortes do dependente também têm histórico.
export async function adicionarDependente(assinaturaId, nome) {
  const cliente = await criarCliente({ nome: nome.trim() })
  const { error } = await supabase
    .from('assinatura_dependentes')
    .insert({ assinatura_id: assinaturaId, cliente_id: cliente.id })
  if (error) throw new Error(mensagemErro(error))
  return { id: cliente.id, cliente_id: cliente.id, nome: cliente.nome }
}

export async function removerDependente(dependenteId) {
  const { error } = await supabase.from('assinatura_dependentes').delete().eq('id', dependenteId)
  if (error) throw new Error(mensagemErro(error))
}

// Conjunto de cliente_ids que são titulares de alguma assinatura ativa —
// usado para marcar "Assinante" na lista de clientes.
export async function idsTitularesAtivos() {
  const { data, error } = await supabase
    .from('assinaturas')
    .select('cliente_id')
    .neq('status', 'cancelada')
  if (error) throw new Error(mensagemErro(error))
  return new Set((data || []).map((a) => a.cliente_id))
}
