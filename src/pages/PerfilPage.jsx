import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { buscarPerfil, atualizarPerfil } from '../data/perfil'

export default function PerfilPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [nome, setNome] = useState('')
  const [instagram, setInstagram] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState('')

  useEffect(() => {
    buscarPerfil()
      .then((p) => {
        setNome(p?.barbearia_nome ?? 'Alemão do Corte')
        setInstagram(p?.instagram ?? 'alemao_doo_corte')
      })
      .catch((err) => setErro(err.message))
      .finally(() => setCarregando(false))
  }, [])

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    setOk('')
    try {
      await atualizarPerfil({
        barbearia_nome: nome.trim() || 'Alemão do Corte',
        instagram: instagram.trim().replace(/^@/, '') || null,
      })
      setOk('Salvo!')
    } catch (err) {
      setErro(err.message)
    } finally {
      setSalvando(false)
    }
  }

  async function sair() {
    await signOut()
    navigate('/login')
  }

  const instagramLimpo = instagram.trim().replace(/^@/, '')

  return (
    <div className="pagina">
      <header className="cabecalho-simples">
        <h1>Perfil</h1>
      </header>

      {erro && <div className="alerta alerta-erro">{erro}</div>}
      {ok && <div className="alerta alerta-info">{ok}</div>}

      {carregando ? (
        <div className="vazio">Carregando…</div>
      ) : (
        <form onSubmit={salvar} className="form-perfil">
          <div className="campo">
            <label htmlFor="nome">Nome da barbearia</label>
            <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            <small>Aparece nas mensagens de lembrete do WhatsApp.</small>
          </div>
          <div className="campo">
            <label htmlFor="ig">Instagram</label>
            <input id="ig" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="alemao_doo_corte" />
          </div>
          {instagramLimpo && (
            <a className="link-ig" href={`https://instagram.com/${instagramLimpo}`} target="_blank" rel="noreferrer">
              @{instagramLimpo}
            </a>
          )}
          <button type="submit" className="btn btn-bloco" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </form>
      )}

      <div className="conta">
        <span className="conta__email">{user?.email}</span>
        <button className="btn btn-secundario btn-bloco" onClick={sair}>Sair</button>
      </div>
    </div>
  )
}
