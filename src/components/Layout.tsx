import { Outlet, Link, useLocation } from 'react-router-dom'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import {
  Home,
  Users,
  CreditCard,
  Settings as SettingsIcon,
  LogOut,
  Package,
  Ticket,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export default function Layout() {
  const { signOut } = useAuth()
  const location = useLocation()

  const navItems = [
    { title: 'Dashboard', path: '/admin', icon: Home },
    { title: 'Assinaturas', path: '/admin/assinaturas', icon: CreditCard },
    { title: 'Módulos', path: '/admin/modulos', icon: Package },
    { title: 'Usuários', path: '/admin/usuarios', icon: Users },
    { title: 'Cupons', path: '/admin/cupons', icon: Ticket },
    { title: 'Configurações', path: '/admin/configuracoes', icon: SettingsIcon },
  ]

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="h-16 flex items-center px-4 border-b border-border font-bold text-lg text-primary">
          Elektra HUB Admin
        </SidebarHeader>
        <SidebarContent className="p-4">
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton asChild isActive={location.pathname === item.path}>
                  <Link to={item.path} className="flex items-center gap-3">
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground"
            onClick={signOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col min-h-screen">
        <header className="h-16 flex items-center px-6 border-b border-border bg-card shadow-sm shrink-0">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mx-4 h-6" />
          <h2 className="font-medium text-sm text-muted-foreground">Admin Portal</h2>
        </header>
        <main className="flex-1 p-6 overflow-auto bg-background">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
