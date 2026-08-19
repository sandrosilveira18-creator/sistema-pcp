import { supabase } from '../lib/supabaseClient'
import { mensagemErro } from '../utils/erros'

// Todos os agendamentos de um dia (YYYY-MM-DD), ordenados por horário.
export async function listarAgendamentosDoDia(data) {
  const { data: rows, error } = await supabase
    .from('agendamentos')
    .select('*')
    .eq('data', data)
    .order('hora', { ascending: true })
  if (error) throw new Error(mensagemErro(error))
  return rows
}

// Cria um agendamento gravando o snapshot do serviço (nome/preço/duração),
// para que histórico e financeiro não mudem se o serviço for editado depois.
export async function criarAgendamento({ servico, ...payload }) {
  const registro = {
    ...payload,
    servico_id: servico?.id ?? null,
    servico_nome: servico?.nome ?? payload.servico_nome,
    preco: servico?.preco ?? payload.preco ?? 0,
    duracao_min: servico?.duracao_min ?? payload.duracao_min ?? 30,
  }
  const { data, error } = await supabase.from('agendamentos').insert(registro).select().single()
  if (error) throw new Error(mensagemErro(error))
  return data
}

export async function atualizarAgendamento(id, payload) {
  const { data, error } = await supabase
    .from('agendamentos')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(mensagemErro(error))
  return data
}

export async function definirStatus(id, status) {
  return atualizarAgendamento(id, { status })
}

export async function marcarLembreteEnviado(id) {
  return atualizarAgendamento(id, { lembrete_enviado: true })
}

export async function excluirAgendamento(id) {
  const { error } = await supabase.from('agendamentos').delete().eq('id', id)
  if (error) throw new Error(mensagemErro(error))
}
