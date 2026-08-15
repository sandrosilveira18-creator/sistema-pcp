import { useEffect, useMemo, useState } from 'react'
import { listarUnidades, unidadesPorDimensao } from '../data/unidades'
import { listarCategorias, criarCategoria } from '../data/categorias'
import { listarInsumos, criarInsumo, atualizarInsumo, excluirInsumo } from '../data/insumos'
import { fnCustoBase } from '../utils/calculo'
import { formatarBRL } from '../utils/format'

const UNIDADE_BASE_LABEL = { massa: 'g', volume: 'ml', contagem: 'un' }

const FORM_VAZIO = {
  nome: '',
  categoria_id: '',
  unidade_compra_id: '',
  quantidade_compra: '',
  preco_compra: '',
  estoque_atual: '',
  estoque_minimo: '',
  ativo: true,
}

export default function InsumosPage() {
  const [unidades, setUnidades] = useState([])
  const [categorias, setCategorias] = useState([])
  const [insumos, setInsumos] = useState([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [formAberto, setFormAberto] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [novaCategoria, setNovaCategoria] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    carregarTudo()
  }, [])

  async function carregarTudo() {
    setCarregando(true)
    setErro('')
    try {
      const [u, c, i] = await Promise.all([
        listarUnidades(),
        listarCategorias('insumo'),
        listarInsumos(),
      ])
      setUnidades(u)
      setCategorias(c)
      setInsumos(i)
    } catch (err) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }

  const insumosFiltrados = useMemo(() => {
    if (!busca.trim()) return insumos
    return insumos.filter((i) => i.nome.toLowerCase().includes(busca.trim().toLowerCase()))
  }, [insumos, busca])

  const unidadeSelecionada = unidades.find((u) => u.id === Number(form.unidade_compra_id))

  const custoBasePreview = useMemo(() => {
    if (!unidadeSelecionada) return null
    const preco = Number(form.preco_compra)
    const quantidade = Number(form.quantidade_compra)
    if (!preco || !quantidade || quantidade <= 0) return null
    return fnCustoBase({
      preco_compra: preco,
      quantidade_compra: quantidade,
      fator_base_unidade_compra: unidadeSelecionada.fator_base,
    })
  }, [form.preco_compra, form.quantidade_compra, unidadeSelecionada])

  function abrirNovo() {
    setForm(FORM_VAZIO)
    setEditandoId(null)
    setFormAberto(true)
  }

  function abrirEdicao(insumo) {
    setForm({
      nome: insumo.nome,
      categoria_id: insumo.categoria_id ?? '',
      unidade_compra_id: insumo.unidade_compra_id,
      quantidade_compra: insumo.quantidade_compra,
      preco_compra: insumo.preco_compra,
      estoque_atual: insumo.estoque_atual ?? 0,
      estoque_minimo: insumo.estoque_minimo ?? 0,
      ativo: insumo.ativo,
    })
    setEditandoId(insumo.id)
    setFormAberto(true)
  }

  async function handleSalvar(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)
    try {
      const payload = {
        nome: form.nome.trim(),
        categoria_id: form.categoria_id ? Number(form.categoria_id) : null,
        unidade_compra_id: Number(form.unidade_compra_id),
        quantidade_compra: Number(form.quantidade_compra),
        preco_compra: Number(form.preco_compra),
        estoque_atual: Number(form.estoque_atual) || 0,
        estoque_minimo: Number(form.estoque_minimo) || 0,
        ativo: form.ativo,
      }
      if (editandoId) {
        await atualizarInsumo(editandoId, payload)
      } else {
        await criarInsumo(payload)
      }
      setFormAberto(false)
      await carregarTudo()
    } catch (err) {
      setErro(err.message)
    } finally {
      setSalvando(false)
    }
  }

  async function handleExcluir(insumo) {
    if (!confirm(`Excluir o insumo "${insumo.nome}"? Essa ação não pode ser desfeita.`)) return
    setErro('')
    try {
      await excluirInsumo(insumo.id)
      await carregarTudo()
    } catch (err) {
      setErro(err.message)
    }
  }

  async function handleNovaCategoria() {
    if (!novaCategoria.trim()) return
    try {
      const cat = await criarCategoria({ nome: novaCategoria.trim(), tipo: 'insumo' })
      setCategorias((prev) => [...prev, cat].sort((a, b) => a.nome.localeCompare(b.nome)))
      setForm((f) => ({ ...f, categoria_id: cat.id }))
      setNovaCategoria('')
    } catch (err) {
      setErro(err.message)
    }
  }

  return (
    <div>
      <div className="topo-pagina">
        <div>
          <h2>Insumos</h2>
          <p>Cadastre seus insumos com preço e unidade de compra para calcular o custo automaticamente.</p>
        </div>
        <button className="btn" onClick={abrirNovo}>+ Novo insumo</button>
      </div>

      {erro && <div className="alerta alerta-erro">{erro}</div>}

      {formAberto && (
        <div className="card">
          <h3>{editandoId ? 'Editar insumo' : 'Novo insumo'}</h3>
          <form onSubmit={handleSalvar}>
            <div className="campo">
              <label htmlFor="nome">Nome</label>
              <input id="nome" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>

            <div className="linha-form">
              <div className="campo">
                <label htmlFor="categoria">Categoria</label>
                <select id="categoria" value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}>
                  <option value="">Sem categoria</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label htmlFor="nova-categoria">Nova categoria</label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input id="nova-categoria" value={novaCategoria} onChange={(e) => setNovaCategoria(e.target.value)} placeholder="ex.: Hortifruti" />
                  <button type="button" className="btn btn-secundario" onClick={handleNovaCategoria}>+</button>
                </div>
              </div>
            </div>

            <div className="linha-form">
              <div className="campo">
                <label htmlFor="unidade">Unidade de compra</label>
                <select id="unidade" required value={form.unidade_compra_id} onChange={(e) => setForm({ ...form, unidade_compra_id: e.target.value })}>
                  <option value="">Selecione…</option>
                  {unidades.map((u) => (
                    <option key={u.id} value={u.id}>{u.nome} ({u.sigla})</option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label htmlFor="quantidade">Quantidade comprada</label>
                <input id="quantidade" type="number" step="any" min="0.0001" required value={form.quantidade_compra} onChange={(e) => setForm({ ...form, quantidade_compra: e.target.value })} />
              </div>
              <div className="campo">
                <label htmlFor="preco">Preço pago (R$)</label>
                <input id="preco" type="number" step="0.01" min="0" required value={form.preco_compra} onChange={(e) => setForm({ ...form, preco_compra: e.target.value })} />
              </div>
            </div>

            {custoBasePreview !== null && unidadeSelecionada && (
              <div className="alerta alerta-info">
                Custo calculado: <strong>{formatarBRL(custoBasePreview)}</strong> por {UNIDADE_BASE_LABEL[unidadeSelecionada.dimensao]}
              </div>
            )}

            <div className="linha-form">
              <div className="campo">
                <label htmlFor="estoque-atual">Estoque atual</label>
                <input id="estoque-atual" type="number" step="any" min="0" value={form.estoque_atual} onChange={(e) => setForm({ ...form, estoque_atual: e.target.value })} />
              </div>
              <div className="campo">
                <label htmlFor="estoque-minimo">Estoque mínimo</label>
                <input id="estoque-minimo" type="number" step="any" min="0" value={form.estoque_minimo} onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })} />
              </div>
              <div className="campo">
                <label htmlFor="ativo">Situação</label>
                <select id="ativo" value={form.ativo ? '1' : '0'} onChange={(e) => setForm({ ...form, ativo: e.target.value === '1' })}>
                  <option value="1">Ativo</option>
                  <option value="0">Inativo</option>
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
        <input className="busca" placeholder="Buscar insumo…" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      <div className="card">
        {carregando ? (
          <p>Carregando…</p>
        ) : insumosFiltrados.length === 0 ? (
          <div className="vazio">Nenhum insumo cadastrado ainda.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Compra</th>
                <th>Custo base</th>
                <th>Estoque</th>
                <th>Situação</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {insumosFiltrados.map((insumo) => {
                const custoBase = fnCustoBase({
                  preco_compra: insumo.preco_compra,
                  quantidade_compra: insumo.quantidade_compra,
                  fator_base_unidade_compra: insumo.unidade_compra?.fator_base ?? 1,
                })
                const estoqueBaixo = Number(insumo.estoque_atual) < Number(insumo.estoque_minimo) && Number(insumo.estoque_minimo) > 0
                return (
                  <tr key={insumo.id}>
                    <td>{insumo.nome}</td>
                    <td>{insumo.categoria?.nome ?? '—'}</td>
                    <td>{insumo.quantidade_compra} {insumo.unidade_compra?.sigla} por {formatarBRL(insumo.preco_compra)}</td>
                    <td>{formatarBRL(custoBase)} / {UNIDADE_BASE_LABEL[insumo.unidade_compra?.dimensao]}</td>
                    <td>
                      {insumo.estoque_atual ?? 0}
                      {estoqueBaixo && <span className="badge badge-alerta" style={{ marginLeft: '0.4rem' }}>Estoque baixo</span>}
                    </td>
                    <td>
                      <span className={`badge ${insumo.ativo ? 'badge-ok' : 'badge-neutro'}`}>{insumo.ativo ? 'Ativo' : 'Inativo'}</span>
                    </td>
                    <td>
                      <div className="lista-acoes">
                        <button className="btn-texto" onClick={() => abrirEdicao(insumo)}>Editar</button>
                        <button className="btn-texto" style={{ color: 'var(--cor-erro)' }} onClick={() => handleExcluir(insumo)}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
