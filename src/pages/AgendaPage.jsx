import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  listarAgendamentosDoDia,
  criarAgendamento,
  definirStatus,
  marcarLembreteEnviado,
  excluirAgendamento,
} from '../data/agendamentos'
import { listarServicos } from '../data/servicos'
import { buscarPerfil } from '../data/perfil'
import { buscarClientesRapido, criarCliente } from '../data/clientes'
import {
  formatarBRL,
  formatarHora,
  formatarDataLonga,
  hojeISO,
  somarDias,
} from '../utils/format'
import { linkWhatsApp, mensagemLembrete } from '../utils/whatsapp'

const STATUS_LABEL = {
  agendado: 'Agendado',
  atendido: 'Atendido',
  faltou: 'Faltou',
  cancelado: 'Cancelado',
}

export default function AgendaPage() {
  const [dia, setDia] = useState(hojeISO())
  const [agendamentos, setAgendamentos] = useState([])
  const [servicos, setServicos] = useState([])
  const [perfil, setPerfil] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [modalAberto, setModalAberto] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const rows = await listarAgendamentosDoDia(dia)
      setAgendamentos(rows)
    } catch (err) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }, [dia])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    listarServicos({ apenasAtivos: true }).then(setServicos).catch(() => {})
    buscarPerfil().then(setPerfil).catch(() => {})
  }, [])

  // Próximo = primeiro agendamento ainda "agendado" (a lista já vem por hora).
  const proximoId = useMemo(() => {
    const p = agendamentos.find((a) => a.status === 'agendado')
    return p?.id ?? null
  }, [agendamentos])

  const ativos = useMemo(
    () => agendamentos.filter((a) => a.status !== 'cancelado'),
    [agendamentos],
  )
  const totalPrevisto = useMemo(
    () => ativos.reduce((s, a) => s + Number(a.preco || 0), 0),
    [ativos],
  )

  async function mudarStatus(ag, status) {
    try {
      await definirStatus(ag.id, status)
      await carregar()
    } catch (err) {
      setErro(err.message)
    }
  }

  function enviarLembrete(ag) {
    const msg = mensagemLembrete({
      clienteNome: ag.cliente_nome,
      barbeariaNome: perfil?.barbearia_nome,
      dataISO: ag.data,
      hora: ag.hora,
      servicoNome: ag.servico_nome,
    })
    window.open(linkWhatsApp({ telefone: ag.cliente_telefone, mensagem: msg }), '_blank')
    marcarLembreteEnviado(ag.id).then(carregar).catch(() => {})
  }

  async function remover(ag) {
    if (!window.confirm(`Excluir o agendamento de ${ag.cliente_nome}?`)) return
    try {
      await excluirAgendamento(ag.id)
      await carregar()
    } catch (err) {
      setErro(err.message)
    }
  }

  const ehHoje = dia === hojeISO()

  return (
    <div className="pagina">
      <header className="cabecalho-dia">
        <button className="btn-navdia" onClick={() => setDia(somarDias(dia, -1))} aria-label="Dia anterior">‹</button>
        <div className="cabecalho-dia__centro">
          <span className="cabecalho-dia__data">{formatarDataLonga(dia)}</span>
          {!ehHoje && (
            <button className="link-hoje" onClick={() => setDia(hojeISO())}>voltar pra hoje</button>
          )}
        </div>
        <button className="btn-navdia" onClick={() => setDia(somarDias(dia, 1))} aria-label="Próximo dia">›</button>
      </header>

      {erro && <div className="alerta alerta-erro">{erro}</div>}

      {!carregando && ativos.length > 0 && (
        <div className="resumo-dia">
          <span><strong>{ativos.length}</strong> {ativos.length === 1 ? 'cliente' : 'clientes'}</span>
          <span className="resumo-dia__sep">·</span>
          <span><strong>{formatarBRL(totalPrevisto)}</strong> previsto</span>
        </div>
      )}

      {carregando ? (
        <div className="vazio">Carregando…</div>
      ) : agendamentos.length === 0 ? (
        <div className="vazio">
          <p>Nenhum horário {ehHoje ? 'pra hoje' : 'nesse dia'}.</p>
          <p className="vazio__dica">Toque em <strong>+ Novo</strong> pra marcar.</p>
        </div>
      ) : (
        <ul className="lista-agenda">
          {agendamentos.map((ag) => (
            <li
              key={ag.id}
              className={
                'cartao-ag' +
                (ag.id === proximoId ? ' proximo' : '') +
                (ag.status === 'cancelado' || ag.status === 'faltou' ? ' apagado' : '')
              }
            >
              <div className="cartao-ag__hora">
                {formatarHora(ag.hora)}
                {ag.id === proximoId && <span className="tag-proximo">próximo</span>}
              </div>
              <div className="cartao-ag__info">
                <span className="cartao-ag__cliente">{ag.cliente_nome}</span>
                <span className="cartao-ag__servico">
                  {ag.servico_nome} · {formatarBRL(Number(ag.preco))}
                </span>
                {ag.status !== 'agendado' && (
                  <span className={`selo selo-${ag.status}`}>{STATUS_LABEL[ag.status]}</span>
                )}
              </div>
              <div className="cartao-ag__acoes">
                {ag.status === 'agendado' && (
                  <>
                    <button className="acao ok" onClick={() => mudarStatus(ag, 'atendido')} title="Atendido">✓</button>
                    <button className="acao falta" onClick={() => mudarStatus(ag, 'faltou')} title="Faltou">✕</button>
                    <button className="acao zap" onClick={() => enviarLembrete(ag)} title="Lembrete no WhatsApp">
                      {ag.lembrete_enviado ? '💬✓' : '💬'}
                    </button>
                  </>
                )}
                {ag.status !== 'agendado' && (
                  <button className="acao voltar" onClick={() => mudarStatus(ag, 'agendado')} title="Reabrir">↺</button>
                )}
                <button className="acao lixo" onClick={() => remover(ag)} title="Excluir">🗑</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button className="fab" onClick={() => setModalAberto(true)}>+ Novo</button>

      {modalAberto && (
        <NovoAgendamentoModal
          diaPadrao={dia}
          servicos={servicos}
          onFechar={() => setModalAberto(false)}
          onSalvo={() => { setModalAberto(false); carregar() }}
          onErro={setErro}
        />
      )}
    </div>
  )
}

function NovoAgendamentoModal({ diaPadrao, servicos, onFechar, onSalvo, onErro }) {
  const [clienteNome, setClienteNome] = useState('')
  const [clienteTelefone, setClienteTelefone] = useState('')
  const [clienteId, setClienteId] = useState(null) // vínculo com um cliente existente
  const [sugestoes, setSugestoes] = useState([])
  const [servicoId, setServicoId] = useState(servicos[0]?.id ?? '')
  const [data, setData] = useState(diaPadrao)
  const [hora, setHora] = useState('09:00')
  const [observacao, setObservacao] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Autocomplete: busca clientes já cadastrados enquanto digita o nome.
  useEffect(() => {
    if (clienteId) return // já selecionou um cliente, não sugere
    const termo = clienteNome
    const t = setTimeout(() => {
      buscarClientesRapido(termo).then(setSugestoes).catch(() => setSugestoes([]))
    }, 250)
    return () => clearTimeout(t)
  }, [clienteNome, clienteId])

  function selecionarCliente(c) {
    setClienteId(c.id)
    setClienteNome(c.nome)
    if (c.telefone) setClienteTelefone(c.telefone)
    setSugestoes([])
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      const servico = servicos.find((s) => s.id === servicoId) || null
      // Vincula a um cliente: usa o selecionado, senão cria a ficha na hora
      // (assim o histórico do cliente vai sendo montado sozinho).
      let idCliente = clienteId
      if (!idCliente && clienteNome.trim()) {
        try {
          const novo = await criarCliente({
            nome: clienteNome.trim(),
            telefone: clienteTelefone.trim() || null,
          })
          idCliente = novo.id
        } catch {
          idCliente = null // não bloqueia o agendamento se a ficha falhar
        }
      }
      await criarAgendamento({
        cliente_id: idCliente || undefined,
        cliente_nome: clienteNome.trim(),
        cliente_telefone: clienteTelefone.trim() || null,
        servico,
        servico_nome: servico?.nome ?? 'Serviço',
        data,
        hora,
        observacao: observacao.trim() || null,
      })
      onSalvo()
    } catch (err) {
      onErro(err.message)
      setSalvando(false)
    }
  }

  return (
    <div className="modal-fundo" onClick={onFechar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Novo agendamento</h2>
        <form onSubmit={salvar}>
          <div className="campo campo-autocomplete">
            <label htmlFor="cliente">Cliente</label>
            <input
              id="cliente"
              required
              autoComplete="off"
              value={clienteNome}
              onChange={(e) => { setClienteId(null); setClienteNome(e.target.value) }}
              autoFocus
            />
            {sugestoes.length > 0 && (
              <ul className="autocomplete">
                {sugestoes.map((c) => (
                  <li key={c.id} onClick={() => selecionarCliente(c)}>
                    <span>{c.nome}</span>
                    {c.telefone && <small>{c.telefone}</small>}
                  </li>
                ))}
              </ul>
            )}
            {clienteId && <small className="cliente-vinculado">✓ cliente já cadastrado</small>}
          </div>
          <div className="campo">
            <label htmlFor="tel">WhatsApp (opcional)</label>
            <input
              id="tel"
              type="tel"
              inputMode="tel"
              placeholder="(00) 90000-0000"
              value={clienteTelefone}
              onChange={(e) => setClienteTelefone(e.target.value)}
            />
          </div>
          <div className="campo">
            <label htmlFor="servico">Serviço</label>
            {servicos.length === 0 ? (
              <p className="dica-inline">Cadastre um serviço antes na aba Serviços.</p>
            ) : (
              <select id="servico" value={servicoId} onChange={(e) => setServicoId(e.target.value)}>
                {servicos.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome} — {formatarBRL(Number(s.preco))}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="linha-dupla">
            <div className="campo">
              <label htmlFor="data">Data</label>
              <input id="data" type="date" required value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="campo">
              <label htmlFor="hora">Hora</label>
              <input id="hora" type="time" required value={hora} onChange={(e) => setHora(e.target.value)} />
            </div>
          </div>
          <div className="campo">
            <label htmlFor="obs">Observação (opcional)</label>
            <input id="obs" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </div>
          <div className="modal-acoes">
            <button type="button" className="btn btn-secundario" onClick={onFechar}>Cancelar</button>
            <button type="submit" className="btn" disabled={salvando || servicos.length === 0}>
              {salvando ? 'Salvando…' : 'Marcar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
