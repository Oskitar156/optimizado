import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import AppLayout     from './components/layout/AppLayout'
import Dashboard     from './pages/Dashboard'
import Inventario    from './pages/Inventario'
import Ventas        from './pages/Ventas'
import Productos     from './pages/Productos'
import Proveedores   from './pages/Proveedores'
import Clientes      from './pages/Clientes'
import Compras       from './pages/Compras'
import Login         from './pages/Login'
import Configuracion from './pages/Configuracion'
import { useAuthStore } from './store/authStore'

function RequiereAuth() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<RequiereAuth />}>
        <Route element={<AppLayout />}>
          <Route index                   element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"       element={<Dashboard />} />
          <Route path="/inventario"      element={<Inventario />} />
          <Route path="/ventas"          element={<Ventas />} />
          <Route path="/productos"       element={<Productos />} />
          <Route path="/proveedores"     element={<Proveedores />} />
          <Route path="/clientes"        element={<Clientes />} />
          <Route path="/compras"         element={<Compras />} />
          <Route path="/configuracion"   element={<Configuracion />} />
        </Route>
      </Route>
    </Routes>
  )
}
