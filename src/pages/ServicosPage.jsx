import { useEffect, useState } from 'react'
import { listarServicos, criarServico, atualizarServico, excluirServico } from '../data/servicos'
import { formatarBRL } from '../utils/format'

const VAZIO = { nome: '', preco: '', duracao_min: 30 }

export default function ServicosPage() {
  const [servicos, setServicos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [editando, setEditando] = useState(null) // id ou 'novo'
  const [form, setForm] = useState(VAZIO)

  async function carregar() {
    setCarregando(true)
    setErro('')
    try {
      setServicos(await listarServicos())
    } catch (err) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  function abrirNovo() {
    setForm(VAZIO)
    setEditando('novo')
  }

  function abrirEdicao(s) {
    setForm({ nome: s.nome, preco: String(s.preco), duracao_min: s.duracao_min })
    setEditando(s.id)
  }

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    const payload = {
      nome: form.nome.trim(),
      preco: Number(form.preco) || 0,
      duracao_min: Number(form.duracao_min) || 30,
    }
    try {
      if (editando === 'novo') await criarServico(payload)
      else await atualizarServico(editando, payload)
      setEditando(null)
      await carregar()
    } catch (err) {
      setErro(err.message)
    }
  }

  async function alternarAtivo(s) {
    try {
      await atualizarServico(s.id, { ativo: !s.ativo })
      await carregar()
    } catch (err) {
      setErro(err.message)
    }
  }

  async function remover(s) {
    if (!window.confirm(`Excluir o serviço "${s.nome}"?`)) return
    try {
      await excluirServico(s.id)
      await carregar()
    } catch (err) {
      setErro(err.message)
    }
  }

  return (
    <div className="pagina">
      <header className="cabecalho-simples">
        <h1>Serviços</h1>
      </header>

      {erro && <div className="alerta alerta-erro">{erro}</div>}

      {carregando ? (
        <div className="vazio">Carregando…</div>
      ) : servicos.length === 0 ? (
        <div className="vazio"><p>Nenhum serviço ainda.</p></div>
      ) : (
        <ul className="lista-servicos">
          {servicos.map((s) => (
            <li key={s.id} className={'cartao-serv' + (s.ativo ? '' : ' inativo')}>
              <button className="cartao-serv__corpo" onClick={() => abrirEdicao(s)}>
                <span className="cartao-serv__nome">{s.nome}</span>
                <span className="cartao-serv__meta">
                  {formatarBRL(Number(s.preco))} · {s.duracao_min} min
                </span>
              </button>
              <div className="cartao-serv__acoes">
                <button className="acao" onClick={() => alternarAtivo(s)} title={s.ativo ? 'Desativar' : 'Ativar'}>
                  {s.ativo ? '👁' : '🚫'}
                </button>
                <button className="acao lixo" onClick={() => remover(s)} title="Excluir">🗑</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button className="fab" onClick={abrirNovo}>+ Novo</button>

      {editando && (
        <div className="modal-fundo" onClick={() => setEditando(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editando === 'novo' ? 'Novo serviço' : 'Editar serviço'}</h2>
            <form onSubmit={salvar}>
              <div className="campo">
                <label htmlFor="nome">Nome</label>
                <input id="nome" required autoFocus value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div className="linha-dupla">
                <div className="campo">
                  <label htmlFor="preco">Preço (R$)</label>
                  <input id="preco" type="number" min="0" step="0.01" inputMode="decimal" required value={form.preco} onChange={(e) => setForm({ ...form, preco: e.target.value })} />
                </div>
                <div className="campo">
                  <label htmlFor="dur">Duração (min)</label>
                  <input id="dur" type="number" min="5" step="5" inputMode="numeric" required value={form.duracao_min} onChange={(e) => setForm({ ...form, duracao_min: e.target.value })} />
                </div>
              </div>
              <div className="modal-acoes">
                <button type="button" className="btn btn-secundario" onClick={() => setEditando(null)}>Cancelar</button>
                <button type="submit" className="btn">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
