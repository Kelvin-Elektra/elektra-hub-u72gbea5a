import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import {
  Plug,
  LogOut,
  LayoutDashboard,
  Building2,
  Users as UsersIcon,
  Settings as SettingsIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    pb.collection('settings')
      .getFirstListItem('')
      .then((settings) => {
        if (settings.logo) {
          setLogoUrl(pb.files.getURL(settings, settings.logo))
        }
      })
      .catch(() => {})
  }, [])

  const handleSignOut = () => {
    signOut()
    navigate('/login')
  }

  const navItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Painel' },
    { to: '/admin/empresas', icon: Building2, label: 'Empresas' },
    { to: '/admin/usuarios', icon: UsersIcon, label: 'Usuários' },
    { to: '/admin/configuracoes', icon: SettingsIcon, label: 'Configurações' },
  ]

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="w-64 border-r border-border bg-card flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-border">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-8 max-w-[160px] object-contain" />
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center">
                <Plug className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">Elektra Admin</span>
            </div>
          )}
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.to ||
              (item.to !== '/admin' && location.pathname.startsWith(item.to))
            return (
              <Link key={item.to} to={item.to}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={`w-full justify-start gap-3 hover:bg-muted transition-colors ${isActive ? 'bg-secondary' : 'text-muted-foreground'}`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Button>
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold border border-primary/30 shrink-0">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start text-muted-foreground border-border hover:bg-muted hover:text-foreground transition-colors"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-auto p-8 animate-fade-in">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
