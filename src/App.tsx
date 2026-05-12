import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import Index from './pages/Index'
import Subscriptions from './pages/Subscriptions'
import SubscriptionDetail from './pages/SubscriptionDetail'
import Users from './pages/Users'
import ModulesAdmin from './pages/ModulesAdmin'
import Settings from './pages/Settings'
import Auth from './pages/Auth'
import Portal from './pages/Portal'
import MyData from './pages/MyData'
import NotFound from './pages/NotFound'
import VerifyEmail from './pages/VerifyEmail'
import Unverified from './pages/Unverified'
import Layout from './components/Layout'
import PortalLayout from './components/PortalLayout'
import PortalSubscriptions from './pages/PortalSubscriptions'

const RequireAuth = ({ allowedRoles }: { allowedRoles?: string[] }) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  if (!user.verified && location.pathname !== '/unverified') {
    return <Navigate to="/unverified" replace />
  }

  if (user.verified && location.pathname === '/unverified') {
    return <Navigate to={user.role === 'Admin' ? '/admin' : '/cliente'} replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'Admin' ? '/admin' : '/cliente'} replace />
  }

  if (user.role !== 'Admin' && location.pathname.startsWith('/admin')) {
    return <Navigate to="/cliente" replace />
  }
  if (user.role === 'Admin' && location.pathname.startsWith('/cliente')) {
    return <Navigate to="/admin" replace />
  }

  return <Outlet />
}

const RootRedirect = () => {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'Admin' ? '/admin' : '/cliente'} replace />
}

const App = () => (
  <AuthProvider>
    <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" richColors />
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth />} />
          <Route path="/verify" element={<VerifyEmail />} />

          <Route element={<RequireAuth />}>
            <Route path="/unverified" element={<Unverified />} />
          </Route>

          <Route element={<RequireAuth allowedRoles={['User']} />}>
            <Route element={<PortalLayout />}>
              <Route path="/cliente" element={<Portal />} />
              <Route path="/cliente/assinaturas" element={<PortalSubscriptions />} />
              <Route path="/cliente/meus-dados" element={<MyData />} />
            </Route>
          </Route>

          <Route element={<RequireAuth allowedRoles={['Admin']} />}>
            <Route element={<Layout />}>
              <Route path="/admin" element={<Index />} />
              <Route path="/admin/assinaturas" element={<Subscriptions />} />
              <Route path="/admin/assinaturas/:id" element={<SubscriptionDetail />} />
              <Route path="/admin/usuarios" element={<Users />} />
              <Route path="/admin/modulos" element={<ModulesAdmin />} />
              <Route path="/admin/configuracoes" element={<Settings />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  </AuthProvider>
)

export default App
