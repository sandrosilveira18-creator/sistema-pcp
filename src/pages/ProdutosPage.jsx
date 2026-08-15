import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarCategorias, criarCategoria } from '../data/categorias'
import { listarProdutos, criarProduto, excluirProduto } from '../data/produtos'

const FORM_VAZIO = { nome: '', categoria_id: '' }

export default function ProdutosPage() {
  const navigate = useNavigate()
  const [produtos, setProdutos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [formAberto, setFormAberto] = useState(false)
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
      const [p, c] = await Promise.all([listarProdutos(), listarCategorias('produto')])
      setProdutos(p)
      setCategorias(c)
    } catch (err) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }

  const produtosFiltrados = useMemo(() => {
    if (!busca.trim()) return produtos
    return produtos.filter((p) => p.nome.toLowerCase().includes(busca.trim().toLowerCase()))
  }, [produtos, busca])

  async function handleCriar(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)
    try {
      const novo = await criarProduto({
        nome: form.nome.trim(),
        categoria_id: form.categoria_id ? Number(form.categoria_id) : null,
      })
      setFormAberto(false)
      setForm(FORM_VAZIO)
      navigate(`/produtos/${novo.id}`)
    } catch (err) {
      setErro(err.message)
    } finally {
      setSalvando(false)
    }
  }

  async function handleExcluir(produto) {
    if (!confirm(`Excluir o produto "${produto.nome}"? Isso também remove a receita cadastrada.`)) return
    setErro('')
    try {
      await excluirProduto(produto.id)
      await carregarTudo()
    } catch (err) {
      setErro(err.message)
    }
  }

  async function handleNovaCategoria() {
    if (!novaCategoria.trim()) return
    try {
      const cat = await criarCategoria({ nome: novaCategoria.trim(), tipo: 'produto' })
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
          <h2>Produtos do cardápio</h2>
          <p>Monte a ficha técnica e defina a margem para calcular o preço automaticamente.</p>
        </div>
        <button className="btn" onClick={() => setFormAberto(true)}>+ Novo produto</button>
      </div>

      {erro && <div className="alerta alerta-erro">{erro}</div>}

      {formAberto && (
        <div className="card">
          <h3>Novo produto</h3>
          <form onSubmit={handleCriar}>
            <div className="campo">
              <label htmlFor="nome">Nome do produto</label>
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
                  <input id="nova-categoria" value={novaCategoria} onChange={(e) => setNovaCategoria(e.target.value)} placeholder="ex.: Lanches" />
                  <button type="button" className="btn btn-secundario" onClick={handleNovaCategoria}>+</button>
                </div>
              </div>
            </div>
            <p className="ajuda">Após criar, você monta a receita e configura a margem na próxima tela.</p>
            <div className="lista-acoes">
              <button className="btn" type="submit" disabled={salvando}>{salvando ? 'Criando…' : 'Criar e montar ficha técnica'}</button>
              <button className="btn btn-secundario" type="button" onClick={() => setFormAberto(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <input className="busca" placeholder="Buscar produto…" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      <div className="card">
        {carregando ? (
          <p>Carregando…</p>
        ) : produtosFiltrados.length === 0 ? (
          <div className="vazio">Nenhum produto cadastrado ainda.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Margem</th>
                <th>Situação</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {produtosFiltrados.map((produto) => (
                <tr key={produto.id} style={{ cursor: 'pointer' }}>
                  <td onClick={() => navigate(`/produtos/${produto.id}`)}>{produto.nome}</td>
                  <td onClick={() => navigate(`/produtos/${produto.id}`)}>{produto.categoria?.nome ?? '—'}</td>
                  <td onClick={() => navigate(`/produtos/${produto.id}`)}>
                    {produto.margem_tipo === 'markup_custo' ? 'Markup s/ custo' : 'Margem s/ venda'}: {(produto.margem_valor * 100).toFixed(0)}%
                  </td>
                  <td onClick={() => navigate(`/produtos/${produto.id}`)}>
                    <span className={`badge ${produto.ativo ? 'badge-ok' : 'badge-neutro'}`}>{produto.ativo ? 'Ativo' : 'Inativo'}</span>
                  </td>
                  <td>
                    <div className="lista-acoes">
                      <button className="btn-texto" onClick={() => navigate(`/produtos/${produto.id}`)}>Abrir</button>
                      <button className="btn-texto" style={{ color: 'var(--cor-erro)' }} onClick={() => handleExcluir(produto)}>Excluir</button>
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
