import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { session, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [modo, setModo] = useState('entrar') // 'entrar' | 'cadastrar'
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [carregando, setCarregando] = useState(false)

  if (session) return <Navigate to="/agenda" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setMensagem('')
    setCarregando(true)
    try {
      if (modo === 'entrar') {
        await signIn(email, senha)
        navigate('/agenda')
      } else {
        await signUp(email, senha)
        setMensagem('Conta criada! Se a confirmação de e-mail estiver ativa, confirme pelo link enviado e depois entre.')
        setModo('entrar')
      }
    } catch (err) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="login-shell">
      <div className="card login-card">
        <div className="marca">
          <span className="marca__poste" aria-hidden="true">💈</span>
          <h1>Alemão do Corte</h1>
          <p>Agenda e caixa na palma da mão</p>
        </div>

        {erro && <div className="alerta alerta-erro">{erro}</div>}
        {mensagem && <div className="alerta alerta-info">{mensagem}</div>}

        <form onSubmit={handleSubmit}>
          <div className="campo">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
            />
          </div>
          <div className="campo">
            <label htmlFor="senha">Senha</label>
            <input
              id="senha"
              type="password"
              required
              minLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
            />
          </div>
          <button className="btn btn-bloco" type="submit" disabled={carregando}>
            {carregando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <div className="toggle-form">
          {modo === 'entrar' ? (
            <>
              Primeira vez?{' '}
              <button type="button" onClick={() => { setModo('cadastrar'); setErro(''); setMensagem('') }}>
                Criar conta
              </button>
            </>
          ) : (
            <>
              Já tem conta?{' '}
              <button type="button" onClick={() => { setModo('entrar'); setErro(''); setMensagem('') }}>
                Entrar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
