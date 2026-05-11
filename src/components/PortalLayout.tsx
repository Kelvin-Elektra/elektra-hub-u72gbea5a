import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Plug, LogOut } from 'lucide-react'
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
      <header className="h-16 px-6 flex items-center justify-between border-b border-sidebar-border bg-sidebar text-sidebar-foreground shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-8 max-w-[150px] object-contain" />
          ) : (
            <>
              <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center shrink-0">
                <Plug className="text-primary-foreground h-5 w-5" />
              </div>
              <span className="font-bold text-lg text-sidebar-foreground">Elektra HUB</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 mr-4">
            <Avatar className="h-8 w-8 ring-2 ring-primary/20">
              <AvatarImage
                src={`https://img.usecurling.com/ppl/thumbnail?seed=${user?.id || '1'}`}
              />
              <AvatarFallback className="text-foreground">{user?.name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div className="hidden md:flex flex-col">
              <span className="text-sm font-medium leading-none text-sidebar-foreground">
                {user?.name || 'User'}
              </span>
              <span className="text-xs text-sidebar-foreground/70 mt-1">{user?.email}</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="text-sidebar-foreground border-sidebar-border bg-sidebar-accent hover:bg-sidebar-accent/80 hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>
      <main className="flex-1 overflow-auto p-6 md:p-8 w-full animate-fade-in bg-background">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
