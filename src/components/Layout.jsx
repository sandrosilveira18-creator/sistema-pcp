import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <aside className="app-nav">
        <div className="app-nav__marca">Ficha Técnica</div>
        <nav>
          <NavLink to="/produtos" className={({ isActive }) => (isActive ? 'nav-link ativo' : 'nav-link')}>
            Produtos
          </NavLink>
          <NavLink to="/insumos" className={({ isActive }) => (isActive ? 'nav-link ativo' : 'nav-link')}>
            Insumos
          </NavLink>
          <NavLink to="/configuracoes" className={({ isActive }) => (isActive ? 'nav-link ativo' : 'nav-link')}>
            Configurações
          </NavLink>
        </nav>
        <div className="app-nav__rodape">
          <span className="app-nav__usuario" title={user?.email}>{user?.email}</span>
          <button className="btn btn-secundario" onClick={handleSignOut}>Sair</button>
        </div>
      </aside>
      <main className="app-conteudo">
        <Outlet />
      </main>
    </div>
  )
}
