import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Plug, LogOut, LayoutGrid, UserCircle, FileText, Users } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useState, useEffect, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'

export default function PortalLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  const loadLogo = useCallback(() => {
    pb.collection('settings')
      .getFirstListItem('')
      .then((settings) => {
        if (settings.logo) {
          setLogoUrl(pb.files.getURL(settings, settings.logo))
        } else {
          setLogoUrl(null)
        }
      })
      .catch(() => setLogoUrl(null))
  }, [])

  useEffect(() => {
    loadLogo()
  }, [loadLogo])

  useRealtime('settings', loadLogo)

  const handleSignOut = () => {
    signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="h-16 px-6 flex items-center justify-between border-b border-border bg-white text-foreground shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-8 max-w-[150px] object-contain" />
          ) : (
            <>
              <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center shrink-0 shadow-sm">
                <Plug className="text-white h-5 w-5" />
              </div>
              <span className="font-bold text-lg text-foreground tracking-tight">Elektra HUB</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 mr-4">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-semibold leading-none text-foreground">
                {user?.name || 'User'}
              </span>
              <span className="text-xs text-muted-foreground mt-1">{user?.email}</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="text-foreground border-border bg-white hover:bg-muted/50 transition-colors"
          >
            <LogOut className="h-4 w-4 mr-2 text-primary" />
            Sair
          </Button>
        </div>
      </header>

      <div className="border-b border-border bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <nav className="flex space-x-6">
            <NavLink
              to="/cliente"
              end
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                )
              }
            >
              <LayoutGrid className="h-4 w-4" />
              Módulos
            </NavLink>
            {user?.role === 'User_owner' && (
              <>
                <NavLink
                  to="/cliente/assinaturas"
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors',
                      isActive
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                    )
                  }
                >
                  <FileText className="h-4 w-4" />
                  Assinaturas
                </NavLink>
                <NavLink
                  to="/cliente/equipe"
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors',
                      isActive
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                    )
                  }
                >
                  <Users className="h-4 w-4" />
                  Equipe
                </NavLink>
              </>
            )}
            <NavLink
              to="/cliente/meus-dados"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                )
              }
            >
              <UserCircle className="h-4 w-4" />
              Meus Dados
            </NavLink>
          </nav>
        </div>
      </div>

      <main className="flex-1 overflow-auto p-6 md:p-8 w-full animate-fade-in bg-background">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
