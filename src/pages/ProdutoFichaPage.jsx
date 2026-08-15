import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { buscarProduto, atualizarProduto } from '../data/produtos'
import { listarInsumos } from '../data/insumos'
import { listarUnidades, unidadesPorDimensao } from '../data/unidades'
import { listarPlataformas } from '../data/plataformas'
import { listarFichaTecnica, adicionarItemReceita, removerItemReceita } from '../data/produtoInsumos'
import { listarPrecosProduto } from '../data/precos'
import { custoTotalProduto, precoAlvo, precoPlataforma, markupEfetivo } from '../utils/calculo'
import { formatarBRL, formatarPercentual, precoPsicologico } from '../utils/format'

const ITEM_VAZIO = { insumo_id: '', quantidade_uso: '', unidade_uso_id: '', fator_perda: '0' }

export default function ProdutoFichaPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [produto, setProduto] = useState(null)
  const [insumos, setInsumos] = useState([])
  const [unidades, setUnidades] = useState([])
  const [plataformas, setPlataformas] = useState([])
  const [itens, setItens] = useState([])
  const [precosOficiais, setPrecosOficiais] = useState([])

  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [erroFicha, setErroFicha] = useState('')

  const [novoItem, setNovoItem] = useState(ITEM_VAZIO)
  const [salvandoItem, setSalvandoItem] = useState(false)

  const [form, setForm] = useState(null) // preenchido a partir do produto
  const [salvandoPrecificacao, setSalvandoPrecificacao] = useState(false)

  useEffect(() => {
    carregarTudo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function carregarTudo() {
    setCarregando(true)
    setErro('')
    setErroFicha('')
    try {
      const [p, ins, uni, plat] = await Promise.all([
        buscarProduto(id),
        listarInsumos({ apenasAtivos: true }),
        listarUnidades(),
        listarPlataformas({ apenasAtivas: true }),
      ])
      setProduto(p)
      setInsumos(ins)
      setUnidades(uni)
      setPlataformas(plat)
      setForm(formDoProduto(p))
      await recarregarFichaEPrecos()
    } catch (err) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }

  async function recarregarFichaEPrecos() {
    try {
      const [ficha, precos] = await Promise.all([listarFichaTecnica(id), listarPrecosProduto(id)])
      setItens(ficha)
      setPrecosOficiais(precos)
      setErroFicha('')
    } catch (err) {
      // Erro típico aqui: unidade incompatível detectada pela function SQL
      // ao calcular custo de algum item já salvo.
      setErroFicha(err.message)
    }
  }

  function formDoProduto(p) {
    return {
      nome: p.nome,
      margem_tipo: p.margem_tipo,
      margem_valor: String(Math.round(p.margem_valor * 1000) / 10), // fração -> %
      custo_embalagem: String(p.custo_embalagem ?? 0),
      custo_operacional: String(p.custo_operacional ?? 0),
      preco_manual: p.preco_manual != null ? String(p.preco_manual) : '',
    }
  }

  const insumoSelecionado = insumos.find((i) => i.id === novoItem.insumo_id)
  const unidadesCompativeis = insumoSelecionado
    ? unidadesPorDimensao(unidades, insumoSelecionado.unidade_compra.dimensao)
    : []

  async function handleAdicionarItem(e) {
    e.preventDefault()
    setErroFicha('')
    setSalvandoItem(true)
    try {
      await adicionarItemReceita({
        produto_id: id,
        insumo_id: novoItem.insumo_id,
        quantidade_uso: Number(novoItem.quantidade_uso),
        unidade_uso_id: Number(novoItem.unidade_uso_id),
        fator_perda: Number(novoItem.fator_perda) / 100,
      })
      setNovoItem(ITEM_VAZIO)
      await recarregarFichaEPrecos()
    } catch (err) {
      setErroFicha(err.message)
    } finally {
      setSalvandoItem(false)
    }
  }

  async function handleRemoverItem(itemId) {
    setErroFicha('')
    try {
      await removerItemReceita(itemId)
      await recarregarFichaEPrecos()
    } catch (err) {
      setErroFicha(err.message)
    }
  }

  async function handleSalvarPrecificacao(e) {
    e.preventDefault()
    setErro('')
    setSalvandoPrecificacao(true)
    try {
      const payload = {
        margem_tipo: form.margem_tipo,
        margem_valor: Number(form.margem_valor) / 100,
        custo_embalagem: Number(form.custo_embalagem) || 0,
        custo_operacional: Number(form.custo_operacional) || 0,
        preco_manual: form.preco_manual.trim() === '' ? null : Number(form.preco_manual),
      }
      const atualizado = await atualizarProduto(id, payload)
      setProduto(atualizado)
      setForm(formDoProduto(atualizado))
      await recarregarFichaEPrecos()
    } catch (err) {
      setErro(err.message)
    } finally {
      setSalvandoPrecificacao(false)
    }
  }

  const dirty = useMemo(() => {
    if (!produto || !form) return false
    const original = formDoProduto(produto)
    return JSON.stringify(original) !== JSON.stringify(form)
  }, [produto, form])

  // Prévia local (mesmas fórmulas da SQL) para refletir edições ainda não
  // salvas instantaneamente, sem round-trip ao banco a cada tecla.
  const preview = useMemo(() => {
    if (!form) return null
    try {
      const custoTotal = custoTotalProduto({
        itens: itens.map((i) => ({ custo_item: i.custo_item })),
        custo_embalagem: Number(form.custo_embalagem) || 0,
        custo_operacional: Number(form.custo_operacional) || 0,
      })
      const margemValor = Number(form.margem_valor) / 100
      const alvoCalculado = custoTotal > 0 || margemValor > 0
        ? precoAlvo({ custo_total: custoTotal, margem_tipo: form.margem_tipo, margem_valor: margemValor })
        : 0
      const temOverride = form.preco_manual.trim() !== ''
      const precoAlvoFinal = temOverride ? Number(form.preco_manual) : alvoCalculado
      const markup = markupEfetivo({ preco: precoAlvoFinal, custo_total: custoTotal })

      const porPlataforma = plataformas.map((pl) => {
        const sugerido = precoPlataforma({
          preco_alvo: precoAlvoFinal,
          taxa_percentual: pl.taxa_percentual,
          taxa_fixa: pl.taxa_fixa,
        })
        return {
          plataforma_id: pl.id,
          plataforma: pl.nome,
          preco_sugerido: sugerido,
          lucro_liquido: precoAlvoFinal - custoTotal,
        }
      })

      return { custoTotal, precoAlvo: precoAlvoFinal, markup, porPlataforma, temOverride }
    } catch (err) {
      return { erro: err.message }
    }
  }, [form, itens, plataformas])

  if (carregando) return <p>Carregando…</p>
  if (erro && !produto) return <div className="alerta alerta-erro">{erro}</div>
  if (!produto || !form) return null

  const semReceita = itens.length === 0
  const itensComInsumoInativo = itens.filter((i) => !i.insumo_ativo)

  return (
    <div>
      <div className="topo-pagina">
        <div>
          <button className="btn-texto" onClick={() => navigate('/produtos')} style={{ padding: 0, marginBottom: '0.4rem' }}>← Produtos</button>
          <h2>{produto.nome}</h2>
        </div>
      </div>

      {erro && <div className="alerta alerta-erro">{erro}</div>}
      {erroFicha && <div className="alerta alerta-erro">{erroFicha}</div>}
      {semReceita && <div className="alerta alerta-info">Este produto ainda não tem receita cadastrada — o custo é R$ 0,00. Não venda por R$ 0; adicione os insumos abaixo.</div>}
      {itensComInsumoInativo.length > 0 && (
        <div className="alerta alerta-info">
          Atenção: {itensComInsumoInativo.map((i) => i.insumo_nome).join(', ')} {itensComInsumoInativo.length > 1 ? 'estão inativos' : 'está inativo'} mas segue nesta receita ativa.
        </div>
      )}

      <div className="card">
        <h3>Ficha técnica</h3>
        {itens.length > 0 && (
          <table style={{ marginBottom: '1rem' }}>
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Quantidade</th>
                <th>Perda</th>
                <th>Custo do item</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.item_id}>
                  <td>
                    {item.insumo_nome}
                    {!item.insumo_ativo && <span className="badge badge-alerta" style={{ marginLeft: '0.4rem' }}>Inativo</span>}
                  </td>
                  <td>{item.quantidade_uso} {item.unidade_uso_sigla}</td>
                  <td>{(item.fator_perda * 100).toFixed(0)}%</td>
                  <td>{formatarBRL(item.custo_item)}</td>
                  <td><button className="btn-texto" style={{ color: 'var(--cor-erro)' }} onClick={() => handleRemoverItem(item.item_id)}>Remover</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <form onSubmit={handleAdicionarItem}>
          <div className="linha-form">
            <div className="campo">
              <label htmlFor="insumo">Insumo</label>
              <select id="insumo" required value={novoItem.insumo_id} onChange={(e) => setNovoItem({ ...novoItem, insumo_id: e.target.value, unidade_uso_id: '' })}>
                <option value="">Selecione…</option>
                {insumos.map((i) => (
                  <option key={i.id} value={i.id}>{i.nome}</option>
                ))}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="quantidade-uso">Quantidade usada</label>
              <input id="quantidade-uso" type="number" step="any" min="0.0001" required value={novoItem.quantidade_uso} onChange={(e) => setNovoItem({ ...novoItem, quantidade_uso: e.target.value })} />
            </div>
            <div className="campo">
              <label htmlFor="unidade-uso">Unidade</label>
              <select id="unidade-uso" required disabled={!insumoSelecionado} value={novoItem.unidade_uso_id} onChange={(e) => setNovoItem({ ...novoItem, unidade_uso_id: e.target.value })}>
                <option value="">{insumoSelecionado ? 'Selecione…' : 'Escolha o insumo primeiro'}</option>
                {unidadesCompativeis.map((u) => (
                  <option key={u.id} value={u.id}>{u.nome} ({u.sigla})</option>
                ))}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="perda">Perda/desperdício (%)</label>
              <input id="perda" type="number" step="any" min="0" value={novoItem.fator_perda} onChange={(e) => setNovoItem({ ...novoItem, fator_perda: e.target.value })} />
            </div>
          </div>
          <button className="btn" type="submit" disabled={salvandoItem}>{salvandoItem ? 'Adicionando…' : '+ Adicionar insumo à receita'}</button>
        </form>
      </div>

      <div className="card">
        <h3>Precificação</h3>
        <form onSubmit={handleSalvarPrecificacao}>
          <div className="linha-form">
            <div className="campo">
              <label htmlFor="margem-tipo">Tipo de margem</label>
              <select id="margem-tipo" value={form.margem_tipo} onChange={(e) => setForm({ ...form, margem_tipo: e.target.value })}>
                <option value="markup_custo">Markup sobre o custo</option>
                <option value="margem_venda">Margem sobre a venda</option>
              </select>
            </div>
            <div className="campo">
              <label htmlFor="margem-valor">Margem (%)</label>
              <input
                id="margem-valor"
                type="number"
                step="any"
                min="0"
                max={form.margem_tipo === 'margem_venda' ? 99 : undefined}
                value={form.margem_valor}
                onChange={(e) => setForm({ ...form, margem_valor: e.target.value })}
              />
              <span className="ajuda">
                {form.margem_tipo === 'margem_venda'
                  ? 'Precisa ser menor que 100% (é uma fração do preço de venda).'
                  : 'Markup sobre o custo — comum passar de 100% em food service (ex.: 150%, 200%).'}
              </span>
            </div>
            <div className="campo">
              <label htmlFor="embalagem">Custo de embalagem (R$)</label>
              <input id="embalagem" type="number" step="0.01" min="0" value={form.custo_embalagem} onChange={(e) => setForm({ ...form, custo_embalagem: e.target.value })} />
            </div>
            <div className="campo">
              <label htmlFor="operacional">Custo operacional (R$)</label>
              <input id="operacional" type="number" step="0.01" min="0" value={form.custo_operacional} onChange={(e) => setForm({ ...form, custo_operacional: e.target.value })} />
            </div>
          </div>
          <div className="campo">
            <label htmlFor="preco-manual">Preço manual (override, opcional)</label>
            <input id="preco-manual" type="number" step="0.01" min="0" placeholder="Deixe em branco para usar o cálculo automático" value={form.preco_manual} onChange={(e) => setForm({ ...form, preco_manual: e.target.value })} />
            <span className="ajuda">Se preenchido, prevalece sobre o cálculo por margem — a margem efetiva resultante é exibida abaixo.</span>
          </div>
          <div className="lista-acoes">
            <button className="btn" type="submit" disabled={salvandoPrecificacao || !dirty}>{salvandoPrecificacao ? 'Salvando…' : 'Salvar precificação'}</button>
            {dirty && <span className="badge badge-alerta">Alterações não salvas — prévia ao vivo abaixo</span>}
          </div>
        </form>

        {preview?.erro && <div className="alerta alerta-erro">{preview.erro}</div>}

        {preview && !preview.erro && (
          <div style={{ marginTop: '1.25rem' }}>
            <div className="stat-linha"><span>Custo total do produto</span><strong>{formatarBRL(preview.custoTotal)}</strong></div>
            <div className="stat-linha"><span>Preço-alvo (balcão){preview.temOverride ? ' — override manual' : ''}</span><strong>{formatarBRL(preview.precoAlvo)}</strong></div>
            <div className="stat-linha"><span>Sugestão psicológica (balcão)</span><strong>{formatarBRL(precoPsicologico(preview.precoAlvo))}</strong></div>
            <div className="stat-linha"><span>Markup efetivo</span><strong>{formatarPercentual(preview.markup)}</strong></div>

            <h4 style={{ marginTop: '1.25rem' }}>Preço por plataforma</h4>
            <div className="grid-cards">
              {preview.porPlataforma.map((p) => (
                <div key={p.plataforma_id} className="card-plataforma">
                  <h4>{p.plataforma}</h4>
                  <div className="preco-grande">{formatarBRL(p.preco_sugerido)}</div>
                  <div className="preco-sugerido">sugestão: {formatarBRL(precoPsicologico(p.preco_sugerido))}</div>
                  <div className="stat-linha"><span>Lucro líquido</span><strong>{formatarBRL(p.lucro_liquido)}</strong></div>
                </div>
              ))}
              {preview.porPlataforma.length === 0 && <p>Nenhuma plataforma ativa. Cadastre em Configurações.</p>}
            </div>
          </div>
        )}

        {precosOficiais.length > 0 && !dirty && (
          <p className="ajuda" style={{ marginTop: '0.75rem' }}>Valores conferidos com o banco de dados (vw_produto_precos) — fonte única de verdade.</p>
        )}
      </div>
    </div>
  )
}
