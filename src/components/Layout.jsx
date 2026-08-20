import { NavLink, Outlet } from 'react-router-dom'

const ITENS = [
  { to: '/agenda', label: 'Agenda', icone: '📅' },
  { to: '/clientes', label: 'Clientes', icone: '🧑' },
  { to: '/financeiro', label: 'Caixa', icone: '💰' },
  { to: '/servicos', label: 'Serviços', icone: '✂️' },
  { to: '/perfil', label: 'Perfil', icone: '👤' },
]

export default function Layout() {
  return (
    <div className="app-shell">
      <main className="app-conteudo">
        <Outlet />
      </main>
      <nav className="tabbar">
        {ITENS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => (isActive ? 'tab ativo' : 'tab')}
          >
            <span className="tab__icone" aria-hidden="true">{item.icone}</span>
            <span className="tab__label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
