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

  if (session) return <Navigate to="/produtos" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setMensagem('')
    setCarregando(true)
    try {
      if (modo === 'entrar') {
        await signIn(email, senha)
        navigate('/produtos')
      } else {
        await signUp(email, senha)
        setMensagem('Cadastro realizado. Verifique seu e-mail para confirmar a conta (se a confirmação estiver ativada) e depois faça login.')
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
        <h1>Ficha Técnica</h1>
        <p>Precificação automática para food service</p>

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
          <button className="btn" type="submit" disabled={carregando} style={{ width: '100%' }}>
            {carregando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <div className="toggle-form">
          {modo === 'entrar' ? (
            <>
              Ainda não tem conta?{' '}
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
