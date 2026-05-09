import { Outlet, Link, useLocation } from 'react-router-dom'
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar'
import { LayoutDashboard, Building2, Users, Settings, Bell, Search, Plug } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export default function Layout() {
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const getPageName = () => {
    const path = location.pathname
    if (path === '/') return 'Dashboard'
    if (path.startsWith('/empresas')) return 'Empresas'
    if (path.startsWith('/usuarios')) return 'Usuários'
    if (path.startsWith('/configuracoes')) return 'Configurações'
    return 'Página'
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="h-16 flex items-center justify-center border-b border-sidebar-border/50 px-4">
          <div className="flex items-center gap-3 w-full">
            <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center shrink-0">
              <Plug className="text-primary-foreground h-5 w-5" />
            </div>
            <span className="font-bold text-lg text-sidebar-foreground truncate group-data-[collapsible=icon]:hidden">
              Master Hub
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive('/')} tooltip="Dashboard">
                <Link to="/">
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive('/empresas')} tooltip="Empresas">
                <Link to="/empresas">
                  <Building2 />
                  <span>Empresas</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive('/usuarios')} tooltip="Usuários">
                <Link to="/usuarios">
                  <Users />
                  <span>Usuários</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive('/configuracoes')}
                tooltip="Configurações"
              >
                <Link to="/configuracoes">
                  <Settings />
                  <span>Configurações</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <header className="h-16 px-6 flex items-center justify-between border-b bg-background shrink-0">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="hidden md:flex items-center">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <span className="text-muted-foreground">Admin</span>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{getPageName()}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar empresas..."
                className="pl-9 bg-muted/50 border-transparent focus-visible:bg-background"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="relative text-muted-foreground hover:text-foreground"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 bg-destructive rounded-full border-2 border-background" />
            </Button>
            <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-transparent hover:ring-border transition-all">
              <AvatarImage src="https://img.usecurling.com/ppl/thumbnail?gender=male&seed=3" />
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-[#F8FAFC]">
          <div className="p-6 md:p-8 max-w-7xl mx-auto w-full animate-fade-in">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
