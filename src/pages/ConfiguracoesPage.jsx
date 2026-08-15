import { useEffect, useState } from 'react'
import { listarPlataformas, criarPlataforma, atualizarPlataforma, excluirPlataforma } from '../data/plataformas'

const FORM_VAZIO = { nome: '', taxa_percentual: '', taxa_fixa: '0', ativo: true }

export default function ConfiguracoesPage() {
  const [plataformas, setPlataformas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [formAberto, setFormAberto] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    setCarregando(true)
    setErro('')
    try {
      setPlataformas(await listarPlataformas())
    } catch (err) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }

  function abrirNova() {
    setForm(FORM_VAZIO)
    setEditandoId(null)
    setFormAberto(true)
  }

  function abrirEdicao(pl) {
    setForm({
      nome: pl.nome,
      taxa_percentual: String(Math.round(pl.taxa_percentual * 1000) / 10),
      taxa_fixa: String(pl.taxa_fixa),
      ativo: pl.ativo,
    })
    setEditandoId(pl.id)
    setFormAberto(true)
  }

  async function handleSalvar(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)
    try {
      const taxa = Number(form.taxa_percentual) / 100
      if (taxa < 0 || taxa >= 1) {
        throw new Error('A taxa percentual deve estar entre 0% e 99,99%.')
      }
      const payload = {
        nome: form.nome.trim(),
        taxa_percentual: taxa,
        taxa_fixa: Number(form.taxa_fixa) || 0,
        ativo: form.ativo,
      }
      if (editandoId) {
        await atualizarPlataforma(editandoId, payload)
      } else {
        await criarPlataforma(payload)
      }
      setFormAberto(false)
      await carregar()
    } catch (err) {
      setErro(err.message)
    } finally {
      setSalvando(false)
    }
  }

  async function handleExcluir(pl) {
    if (!confirm(`Excluir a plataforma "${pl.nome}"? Produtos deixarão de mostrar preço sugerido para ela.`)) return
    setErro('')
    try {
      await excluirPlataforma(pl.id)
      await carregar()
    } catch (err) {
      setErro(err.message)
    }
  }

  return (
    <div>
      <div className="topo-pagina">
        <div>
          <h2>Configurações</h2>
          <p>Cadastre as plataformas de venda e as taxas cobradas sobre o preço final.</p>
        </div>
        <button className="btn" onClick={abrirNova}>+ Nova plataforma</button>
      </div>

      {erro && <div className="alerta alerta-erro">{erro}</div>}

      {formAberto && (
        <div className="card">
          <h3>{editandoId ? 'Editar plataforma' : 'Nova plataforma'}</h3>
          <form onSubmit={handleSalvar}>
            <div className="campo">
              <label htmlFor="nome">Nome</label>
              <input id="nome" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="linha-form">
              <div className="campo">
                <label htmlFor="taxa-percentual">Taxa percentual (%)</label>
                <input id="taxa-percentual" type="number" step="any" min="0" max="99.99" required value={form.taxa_percentual} onChange={(e) => setForm({ ...form, taxa_percentual: e.target.value })} />
                <span className="ajuda">Incide sobre o preço final — o sistema divide, nunca soma.</span>
              </div>
              <div className="campo">
                <label htmlFor="taxa-fixa">Taxa fixa (R$)</label>
                <input id="taxa-fixa" type="number" step="0.01" min="0" value={form.taxa_fixa} onChange={(e) => setForm({ ...form, taxa_fixa: e.target.value })} />
              </div>
              <div className="campo">
                <label htmlFor="ativo">Situação</label>
                <select id="ativo" value={form.ativo ? '1' : '0'} onChange={(e) => setForm({ ...form, ativo: e.target.value === '1' })}>
                  <option value="1">Ativa</option>
                  <option value="0">Inativa</option>
                </select>
              </div>
            </div>
            <div className="lista-acoes">
              <button className="btn" type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
              <button className="btn btn-secundario" type="button" onClick={() => setFormAberto(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {carregando ? (
          <p>Carregando…</p>
        ) : plataformas.length === 0 ? (
          <div className="vazio">Nenhuma plataforma cadastrada.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Taxa percentual</th>
                <th>Taxa fixa</th>
                <th>Situação</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {plataformas.map((pl) => (
                <tr key={pl.id}>
                  <td>{pl.nome}</td>
                  <td>{(pl.taxa_percentual * 100).toFixed(2)}%</td>
                  <td>{pl.taxa_fixa}</td>
                  <td><span className={`badge ${pl.ativo ? 'badge-ok' : 'badge-neutro'}`}>{pl.ativo ? 'Ativa' : 'Inativa'}</span></td>
                  <td>
                    <div className="lista-acoes">
                      <button className="btn-texto" onClick={() => abrirEdicao(pl)}>Editar</button>
                      <button className="btn-texto" style={{ color: 'var(--cor-erro)' }} onClick={() => handleExcluir(pl)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
