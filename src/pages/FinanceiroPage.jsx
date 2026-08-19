import { useCallback, useEffect, useMemo, useState } from 'react'
import { listarAgendamentosDoDia } from '../data/agendamentos'
import { resumoFinanceiro } from '../utils/financeiro'
import { formatarBRL, formatarDataLonga, hojeISO, somarDias } from '../utils/format'

export default function FinanceiroPage() {
  const [dia, setDia] = useState(hojeISO())
  const [agendamentos, setAgendamentos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      setAgendamentos(await listarAgendamentosDoDia(dia))
    } catch (err) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }, [dia])

  useEffect(() => { carregar() }, [carregar])

  const resumo = useMemo(() => resumoFinanceiro(agendamentos), [agendamentos])
  const ehHoje = dia === hojeISO()

  return (
    <div className="pagina">
      <header className="cabecalho-dia">
        <button className="btn-navdia" onClick={() => setDia(somarDias(dia, -1))} aria-label="Dia anterior">‹</button>
        <div className="cabecalho-dia__centro">
          <span className="cabecalho-dia__data">{formatarDataLonga(dia)}</span>
          {!ehHoje && <button className="link-hoje" onClick={() => setDia(hojeISO())}>voltar pra hoje</button>}
        </div>
        <button className="btn-navdia" onClick={() => setDia(somarDias(dia, 1))} aria-label="Próximo dia">›</button>
      </header>

      {erro && <div className="alerta alerta-erro">{erro}</div>}

      {carregando ? (
        <div className="vazio">Carregando…</div>
      ) : (
        <>
          <div className="caixa-total">
            <span className="caixa-total__rotulo">Faturado no dia</span>
            <span className="caixa-total__valor">{formatarBRL(resumo.total)}</span>
          </div>

          <div className="grade-kpi">
            <div className="kpi">
              <span className="kpi__num">{resumo.quantidadeAtendidos}</span>
              <span className="kpi__rot">atendidos</span>
            </div>
            <div className="kpi">
              <span className="kpi__num">{formatarBRL(resumo.ticketMedio)}</span>
              <span className="kpi__rot">ticket médio</span>
            </div>
            <div className="kpi">
              <span className="kpi__num">{resumo.faltas}</span>
              <span className="kpi__rot">faltas</span>
            </div>
          </div>

          <h2 className="subtitulo">Por serviço</h2>
          {resumo.porServico.length === 0 ? (
            <div className="vazio"><p>Nenhum atendimento marcado como concluído nesse dia.</p></div>
          ) : (
            <ul className="lista-por-servico">
              {resumo.porServico.map((linha) => (
                <li key={linha.servico}>
                  <span className="lps__nome">{linha.servico}</span>
                  <span className="lps__qtd">{linha.quantidade}×</span>
                  <span className="lps__total">{formatarBRL(linha.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
