import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import Index from './pages/Index'
import Companies from './pages/Companies'
import CompanyDetail from './pages/CompanyDetail'
import Users from './pages/Users'
import Settings from './pages/Settings'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'

const RequireAuth = () => {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Outlet /> : <Navigate to="/login" replace />
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
