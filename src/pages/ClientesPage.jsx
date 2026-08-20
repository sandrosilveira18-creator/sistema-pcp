import { useCallback, useEffect, useState } from 'react'
import {
  listarClientes,
  criarCliente,
  atualizarCliente,
  excluirCliente,
  historicoCliente,
} from '../data/clientes'
import { formatarBRL, formatarDataCurta, formatarHora, tempoDesde } from '../utils/format'
import { linkWhatsApp } from '../utils/whatsapp'

const VAZIO = { nome: '', telefone: '', aniversario: '', observacoes: '' }

export default function ClientesPage() {
  const [clientes, setClientes] = useState([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState(null) // cliente em edição, 'novo', ou null

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      setClientes(await listarClientes({ busca: busca.trim() || undefined }))
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

      {erro && <div className="alerta alerta-erro">{erro}</div>}

      {carregando ? (
        <div className="vazio">Carregando…</div>
      ) : clientes.length === 0 ? (
        <div className="vazio">
          <p>{busca ? 'Nenhum cliente com esse nome.' : 'Nenhum cliente ainda.'}</p>
          {!busca && <p className="vazio__dica">Toque em <strong>+ Novo</strong> pra cadastrar.</p>}
        </div>
      ) : (
        <ul className="lista-clientes">
          {clientes.map((c) => (
            <li key={c.id} className="cartao-cli" onClick={() => setAberto(c)}>
              <div className="cartao-cli__info">
                <span className="cartao-cli__nome">{c.nome}</span>
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
