import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import LoginPage from './pages/LoginPage.jsx'
import AgendaPage from './pages/AgendaPage.jsx'
import ServicosPage from './pages/ServicosPage.jsx'
import FinanceiroPage from './pages/FinanceiroPage.jsx'
import ClientesPage from './pages/ClientesPage.jsx'
import PerfilPage from './pages/PerfilPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/agenda" replace />} />
        <Route path="agenda" element={<AgendaPage />} />
        <Route path="clientes" element={<ClientesPage />} />
        <Route path="servicos" element={<ServicosPage />} />
        <Route path="financeiro" element={<FinanceiroPage />} />
        <Route path="perfil" element={<PerfilPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
