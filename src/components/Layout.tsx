import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { LogOut, Users, LayoutDashboard, Settings as SettingsIcon, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignOut = () => {
    signOut()
    navigate('/login')
  }

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Assinaturas', path: '/admin/assinaturas', icon: CreditCard },
    { name: 'Usuários', path: '/admin/usuarios', icon: Users },
    { name: 'Configurações', path: '/admin/configuracoes', icon: SettingsIcon },
  ]

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 bg-slate-950 text-slate-50 flex-col hidden md:flex shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <span className="font-bold text-lg">Elektra Admin</span>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/admin' && location.pathname.startsWith(item.path))
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-slate-950 text-slate-50 flex items-center justify-between px-6 border-b border-slate-800 shrink-0 shadow-sm md:bg-white md:text-foreground md:border-border">
          <div className="flex items-center md:hidden">
            <span className="font-bold text-lg">Elektra Admin</span>
          </div>
          <div className="hidden md:flex"></div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-300 md:text-muted-foreground">
              {user?.name}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-slate-300 hover:text-white hover:bg-slate-800 md:text-muted-foreground md:hover:bg-muted md:hover:text-foreground"
            >
              <LogOut className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Sair</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
