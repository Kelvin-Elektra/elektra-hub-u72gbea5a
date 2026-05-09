import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import Index from './pages/Index'
import Companies from './pages/Companies'
import CompanyDetail from './pages/CompanyDetail'
import Users from './pages/Users'
import Settings from './pages/Settings'
import Login from './pages/Login'
import Portal from './pages/Portal'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'
import PortalLayout from './components/PortalLayout'

const RequireAuth = ({ allowedRoles }: { allowedRoles?: string[] }) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'Admin' ? '/' : '/portal'} replace />
  }

  if (user.role !== 'Admin' && location.pathname === '/') {
    return <Navigate to="/portal" replace />
  }

  return <Outlet />
}

const App = () => (
  <AuthProvider>
    <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" richColors />
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<RequireAuth />}>
            <Route element={<PortalLayout />}>
              <Route path="/portal" element={<Portal />} />
            </Route>
          </Route>

          <Route element={<RequireAuth allowedRoles={['Admin']} />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route path="/empresas" element={<Companies />} />
              <Route path="/empresas/:id" element={<CompanyDetail />} />
              <Route path="/usuarios" element={<Users />} />
              <Route path="/configuracoes" element={<Settings />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  </AuthProvider>
)

export default App
