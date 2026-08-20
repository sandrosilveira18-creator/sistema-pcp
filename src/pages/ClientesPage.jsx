import { useCallback, useEffect, useState } from 'react'
import {
  listarClientes,
  criarCliente,
  atualizarCliente,
  excluirCliente,
  historicoCliente,
} from '../data/clientes'
import {
  assinaturaDoCliente,
  criarAssinatura,
  atualizarAssinatura,
  cancelarAssinatura,
  adicionarDependente,
  removerDependente,
  idsTitularesAtivos,
} from '../data/assinaturas'
import { formatarBRL, formatarDataCurta, formatarHora, tempoDesde } from '../utils/format'
import { linkWhatsApp } from '../utils/whatsapp'

const VAZIO = { nome: '', telefone: '', aniversario: '', observacoes: '' }

export default function ClientesPage() {
  const [clientes, setClientes] = useState([])
  const [titulares, setTitulares] = useState(new Set())
  const [busca, setBusca] = useState('')
  const [soAssinantes, setSoAssinantes] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState(null) // cliente em edição, 'novo', ou null

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const [lista, ids] = await Promise.all([
        listarClientes({ busca: busca.trim() || undefined }),
        idsTitularesAtivos().catch(() => new Set()),
      ])
      setClientes(lista)
      setTitulares(ids)
    } catch (err) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }, [busca])

  useEffect(() => {
    const t = setTimeout(carregar, 250) // debounce da busca
    return () => clearTimeout(t)
  }, [carregar])

  const visiveis = soAssinantes ? clientes.filter((c) => titulares.has(c.id)) : clientes

  return (
    <div className="pagina">
      <header className="cabecalho-simples">
        <h1>Clientes</h1>
      </header>

      <input
        className="busca-input"
        placeholder="Buscar cliente pelo nome…"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      <div className="filtro-chips">
        <button className={soAssinantes ? 'chip' : 'chip ativo'} onClick={() => setSoAssinantes(false)}>Todos</button>
        <button className={soAssinantes ? 'chip ativo' : 'chip'} onClick={() => setSoAssinantes(true)}>⭐ Assinantes</button>
      </div>

      {erro && <div className="alerta alerta-erro">{erro}</div>}

      {carregando ? (
        <div className="vazio">Carregando…</div>
      ) : visiveis.length === 0 ? (
        <div className="vazio">
          <p>{busca || soAssinantes ? 'Nenhum cliente aqui.' : 'Nenhum cliente ainda.'}</p>
          {!busca && !soAssinantes && <p className="vazio__dica">Toque em <strong>+ Novo</strong> pra cadastrar.</p>}
        </div>
      ) : (
        <ul className="lista-clientes">
          {visiveis.map((c) => (
            <li key={c.id} className="cartao-cli" onClick={() => setAberto(c)}>
              <div className="cartao-cli__info">
                <span className="cartao-cli__nome">
                  {c.nome}
                  {titulares.has(c.id) && <span className="badge-assinante">⭐ Assinante</span>}
                </span>
                <span className="cartao-cli__meta">
                  {(c.resumo?.visitas ?? 0)} visita{(c.resumo?.visitas ?? 0) === 1 ? '' : 's'}
                  {' · '}última: {tempoDesde(c.resumo?.ultima_visita)}
                </span>
              </div>
              <span className="cartao-cli__gasto">{formatarBRL(Number(c.resumo?.total_gasto || 0))}</span>
            </li>
          ))}
        </ul>
      )}

      <button className="fab" onClick={() => setAberto('novo')}>+ Novo</button>

      {aberto && (
        <FichaCliente
          cliente={aberto === 'novo' ? null : aberto}
          onFechar={() => setAberto(null)}
          onSalvo={() => { setAberto(null); carregar() }}
          onErro={setErro}
        />
      )}
    </div>
  )
}

function FichaCliente({ cliente, onFechar, onSalvo, onErro }) {
  const ehNovo = !cliente
  const [form, setForm] = useState(
    ehNovo
      ? VAZIO
      : {
          nome: cliente.nome || '',
          telefone: cliente.telefone || '',
          aniversario: cliente.aniversario || '',
          observacoes: cliente.observacoes || '',
        },
  )
  const [historico, setHistorico] = useState([])
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!ehNovo) historicoCliente(cliente.id).then(setHistorico).catch(() => {})
  }, [ehNovo, cliente])

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    const payload = {
      nome: form.nome.trim(),
      telefone: form.telefone.trim() || null,
      aniversario: form.aniversario || null,
      observacoes: form.observacoes.trim() || null,
    }
    try {
      if (ehNovo) await criarCliente(payload)
      else await atualizarCliente(cliente.id, payload)
      onSalvo()
    } catch (err) {
      onErro(err.message)
      setSalvando(false)
    }
  }

  async function remover() {
    if (!window.confirm(`Excluir o cliente ${cliente.nome}? O histórico é mantido, mas some da ficha.`)) return
    try {
      await excluirCliente(cliente.id)
      onSalvo()
    } catch (err) {
      onErro(err.message)
    }
  }

  return (
    <div className="modal-fundo" onClick={onFechar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{ehNovo ? 'Novo cliente' : form.nome || 'Cliente'}</h2>
        <form onSubmit={salvar}>
          <div className="campo">
            <label htmlFor="cnome">Nome</label>
            <input id="cnome" required autoFocus value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="linha-dupla">
            <div className="campo">
              <label htmlFor="ctel">WhatsApp</label>
              <input id="ctel" type="tel" inputMode="tel" placeholder="(00) 90000-0000" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            </div>
            <div className="campo">
              <label htmlFor="cani">Aniversário</label>
              <input id="cani" type="date" value={form.aniversario} onChange={(e) => setForm({ ...form, aniversario: e.target.value })} />
            </div>
          </div>
          <div className="campo">
            <label htmlFor="cobs">Observações</label>
            <input id="cobs" placeholder="Ex.: máquina 2, alérgico a…" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </div>

          {!ehNovo && form.telefone && (
            <a
              className="btn btn-secundario btn-bloco"
              href={linkWhatsApp({ telefone: form.telefone, mensagem: '' })}
              target="_blank"
              rel="noreferrer"
              style={{ marginBottom: 12, textDecoration: 'none', textAlign: 'center' }}
            >
              💬 Abrir WhatsApp
            </a>
          )}

          <div className="modal-acoes">
            <button type="button" className="btn btn-secundario" onClick={onFechar}>Fechar</button>
            <button type="submit" className="btn" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
          </div>
        </form>

        {!ehNovo && <SecaoAssinatura clienteId={cliente.id} onErro={onErro} />}

        {!ehNovo && (
          <div className="historico">
            <h3 className="subtitulo">Histórico</h3>
            {historico.length === 0 ? (
              <p className="dica-inline">Nenhum atendimento registrado ainda.</p>
            ) : (
              <ul className="lista-historico">
                {historico.map((h) => (
                  <li key={h.id}>
                    <span className="lh__data">{formatarDataCurta(h.data)} {formatarHora(h.hora)}</span>
                    <span className="lh__serv">{h.servico_nome}</span>
                    <span className={`lh__status lh__${h.status}`}>
                      {h.status === 'atendido' ? formatarBRL(Number(h.preco)) : h.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="link-excluir" onClick={remover}>Excluir cliente</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Assinatura dentro da ficha do cliente ----
function SecaoAssinatura({ clienteId, onErro }) {
  const [assinatura, setAssinatura] = useState(undefined) // undefined=carregando, null=sem
  const [criando, setCriando] = useState(false)

  const recarregar = useCallback(() => {
    assinaturaDoCliente(clienteId).then(setAssinatura).catch((e) => { onErro(e.message); setAssinatura(null) })
  }, [clienteId, onErro])

  useEffect(() => { recarregar() }, [recarregar])

  return (
    <div className="assinatura-box">
      <h3 className="subtitulo">Assinatura</h3>
      {assinatura === undefined ? (
        <p className="dica-inline">Carregando…</p>
      ) : assinatura === null ? (
        criando ? (
          <NovaAssinatura clienteId={clienteId} onCriado={() => { setCriando(false); recarregar() }} onCancel={() => setCriando(false)} onErro={onErro} />
        ) : (
          <button type="button" className="btn btn-secundario btn-bloco" onClick={() => setCriando(true)}>⭐ Tornar assinante</button>
        )
      ) : (
        <PainelAssinatura assinatura={assinatura} onMudou={recarregar} onErro={onErro} />
      )}
    </div>
  )
}

function NovaAssinatura({ clienteId, onCriado, onCancel, onErro }) {
  const [plano, setPlano] = useState('Mensal')
  const [cortes, setCortes] = useState('4')
  const [valor, setValor] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    setSalvando(true)
    try {
      await criarAssinatura({ clienteId, plano_nome: plano, cortes_inclusos: cortes, valor })
      onCriado()
    } catch (e) {
      onErro(e.message)
      setSalvando(false)
    }
  }

  return (
    <div className="assinatura-form">
      <div className="campo">
        <label>Plano</label>
        <input value={plano} onChange={(e) => setPlano(e.target.value)} placeholder="Ex.: Mensal" />
      </div>
      <div className="linha-dupla">
        <div className="campo">
          <label>Cortes/mês</label>
          <input type="number" min="0" inputMode="numeric" value={cortes} onChange={(e) => setCortes(e.target.value)} />
        </div>
        <div className="campo">
          <label>Valor (R$)</label>
          <input type="number" min="0" step="0.01" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
        </div>
      </div>
      <div className="modal-acoes">
        <button type="button" className="btn btn-secundario" onClick={onCancel}>Cancelar</button>
        <button type="button" className="btn" disabled={salvando} onClick={salvar}>{salvando ? 'Salvando…' : 'Criar'}</button>
      </div>
    </div>
  )
}

function PainelAssinatura({ assinatura, onMudou, onErro }) {
  const [novoDep, setNovoDep] = useState('')
  const [editando, setEditando] = useState(false)
  const [plano, setPlano] = useState(assinatura.plano_nome)
  const [cortes, setCortes] = useState(String(assinatura.cortes_inclusos))
  const [valor, setValor] = useState(String(assinatura.valor))

  async function salvarPlano() {
    try {
      await atualizarAssinatura(assinatura.id, {
        plano_nome: plano.trim() || 'Mensal',
        cortes_inclusos: Number(cortes) || 0,
        valor: Number(valor) || 0,
      })
      setEditando(false)
      onMudou()
    } catch (e) { onErro(e.message) }
  }

  async function addDep(e) {
    e.preventDefault()
    if (!novoDep.trim()) return
    try {
      await adicionarDependente(assinatura.id, novoDep)
      setNovoDep('')
      onMudou()
    } catch (er) { onErro(er.message) }
  }

  async function remDep(id) {
    try { await removerDependente(id); onMudou() } catch (e) { onErro(e.message) }
  }

  async function cancelar() {
    if (!window.confirm('Cancelar a assinatura desse cliente?')) return
    try { await cancelarAssinatura(assinatura.id); onMudou() } catch (e) { onErro(e.message) }
  }

  const { usados_mes, cortes_inclusos, restantes } = assinatura
  const pct = cortes_inclusos ? Math.min(100, Math.round((usados_mes / cortes_inclusos) * 100)) : 0

  return (
    <div className="painel-assinatura">
      <div className="uso-mes">
        <div className="uso-mes__topo">
          <span>{assinatura.plano_nome} · {formatarBRL(Number(assinatura.valor))}/mês</span>
          <span className="uso-mes__contagem">{usados_mes}/{cortes_inclusos} no mês</span>
        </div>
        <div className="uso-barra"><div className="uso-barra__fill" style={{ width: `${pct}%` }} /></div>
        <span className="uso-mes__restam">{restantes} corte{restantes === 1 ? '' : 's'} restante{restantes === 1 ? '' : 's'} este mês</span>
      </div>

      <div className="dependentes">
        <span className="dependentes__titulo">Dependentes</span>
        {assinatura.dependentes.length === 0 ? (
          <p className="dica-inline">Nenhum dependente.</p>
        ) : (
          <ul className="lista-dep">
            {assinatura.dependentes.map((d) => (
              <li key={d.id}>
                <span>{d.nome}</span>
                <button type="button" className="acao lixo" onClick={() => remDep(d.id)} title="Remover">✕</button>
              </li>
            ))}
          </ul>
        )}
        <form className="add-dep" onSubmit={addDep}>
          <input placeholder="Nome do dependente" value={novoDep} onChange={(e) => setNovoDep(e.target.value)} />
          <button type="submit" className="btn btn-secundario">Adicionar</button>
        </form>
      </div>

      {editando ? (
        <div className="assinatura-form">
          <div className="campo"><label>Plano</label><input value={plano} onChange={(e) => setPlano(e.target.value)} /></div>
          <div className="linha-dupla">
            <div className="campo"><label>Cortes/mês</label><input type="number" min="0" value={cortes} onChange={(e) => setCortes(e.target.value)} /></div>
            <div className="campo"><label>Valor (R$)</label><input type="number" min="0" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} /></div>
          </div>
          <div className="modal-acoes">
            <button type="button" className="btn btn-secundario" onClick={() => setEditando(false)}>Cancelar</button>
            <button type="button" className="btn" onClick={salvarPlano}>Salvar plano</button>
          </div>
        </div>
      ) : (
        <div className="assinatura-acoes">
          <button type="button" className="link-editar" onClick={() => setEditando(true)}>Editar plano</button>
          <button type="button" className="link-excluir" onClick={cancelar}>Cancelar assinatura</button>
        </div>
      )}
    </div>
  )
}
