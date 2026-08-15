import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import LoginPage from './pages/LoginPage.jsx'
import InsumosPage from './pages/InsumosPage.jsx'
import ProdutosPage from './pages/ProdutosPage.jsx'
import ProdutoFichaPage from './pages/ProdutoFichaPage.jsx'
import ConfiguracoesPage from './pages/ConfiguracoesPage.jsx'

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
        <Route index element={<Navigate to="/produtos" replace />} />
        <Route path="produtos" element={<ProdutosPage />} />
        <Route path="produtos/:id" element={<ProdutoFichaPage />} />
        <Route path="insumos" element={<InsumosPage />} />
        <Route path="configuracoes" element={<ConfiguracoesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
