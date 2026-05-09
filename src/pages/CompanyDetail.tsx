import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Building2, CreditCard, Plug, Users, Calendar, Mail } from 'lucide-react'
import { mockCompanies, mockUsers } from '@/lib/data'

export default function CompanyDetail() {
  const { id } = useParams()
  const company = mockCompanies.find((c) => c.id === id)
  const users = mockUsers.filter((u) => u.companyId === id)

  const [elektraEnabled, setElektraEnabled] = useState(
    company?.modules.includes('Elektra CRM') || false,
  )
  const [nexusEnabled, setNexusEnabled] = useState(company?.modules.includes('Nexus ERP') || false)

  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <h2 className="text-2xl font-bold">Empresa não encontrada</h2>
        <Button asChild>
          <Link to="/empresas">Voltar para a lista</Link>
        </Button>
      </div>
    )
  }

  const handleSync = (moduleName: string, active: boolean, setter: (val: boolean) => void) => {
    setter(active)
    const promise = new Promise((resolve) => setTimeout(resolve, 1500))
    toast.promise(promise, {
      loading: `Sincronizando estado do ${moduleName} com a API principal...`,
      success: `Acesso ao ${moduleName} foi ${active ? 'habilitado' : 'bloqueado'} e sincronizado.`,
      error: 'Erro na sincronização.',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link to="/empresas">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
              {company.document}
            </span>
            • Cliente desde {new Date(company.created).toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="w-full justify-start h-auto p-1 bg-muted/50">
          <TabsTrigger value="geral" className="gap-2 py-2">
            <Building2 className="h-4 w-4" /> Geral
          </TabsTrigger>
          <TabsTrigger value="assinatura" className="gap-2 py-2">
            <CreditCard className="h-4 w-4" /> Assinatura (Asaas)
          </TabsTrigger>
          <TabsTrigger value="modulos" className="gap-2 py-2">
            <Plug className="h-4 w-4" /> Módulos & Acesso
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="gap-2 py-2">
            <Users className="h-4 w-4" /> Usuários ({users.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Cadastrais</CardTitle>
              <CardDescription>Dados principais da empresa.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-2xl">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Razão Social / Nome</Label>
                  <Input defaultValue={company.name} />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ / CPF</Label>
                  <Input defaultValue={company.document} readOnly className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>E-mail de Contato Principal</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input defaultValue={company.email} className="pl-9" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status Atual</Label>
                  <div className="h-10 px-3 py-2 border rounded-md bg-muted/50 flex items-center">
                    <Badge variant="outline" className="bg-background">
                      {company.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <Button className="mt-4">Salvar Alterações</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assinatura" className="mt-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Plano Atual</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{company.plan}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Valor Mensal (MRR)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    company.mrr,
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Próximo Vencimento</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div className="text-xl font-bold">
                  {company.nextBilling !== '-'
                    ? new Date(company.nextBilling).toLocaleDateString('pt-BR')
                    : '-'}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="modulos" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Sincronização de Módulos</CardTitle>
              <CardDescription>
                A alteração do status aqui refletirá em tempo real no banco de dados do respectivo
                módulo (Source of Truth).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-card shadow-sm">
                <div className="space-y-1">
                  <h4 className="font-semibold flex items-center gap-2">
                    Elektra CRM
                    {elektraEnabled ? (
                      <Badge
                        variant="outline"
                        className="bg-emerald-500/10 text-emerald-600 border-emerald-200"
                      >
                        Ativo
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-red-500/10 text-red-600 border-red-200"
                      >
                        Bloqueado
                      </Badge>
                    )}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Permite acesso ao CRM de vendas e prospecção.
                  </p>
                </div>
                <Switch
                  checked={elektraEnabled}
                  onCheckedChange={(c) => handleSync('Elektra CRM', c, setElektraEnabled)}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg bg-card shadow-sm">
                <div className="space-y-1">
                  <h4 className="font-semibold flex items-center gap-2">
                    Nexus ERP
                    {nexusEnabled ? (
                      <Badge
                        variant="outline"
                        className="bg-emerald-500/10 text-emerald-600 border-emerald-200"
                      >
                        Ativo
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-red-500/10 text-red-600 border-red-200"
                      >
                        Bloqueado
                      </Badge>
                    )}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Permite acesso ao ERP financeiro e controle de estoque.
                  </p>
                </div>
                <Switch
                  checked={nexusEnabled}
                  onCheckedChange={(c) => handleSync('Nexus ERP', c, setNexusEnabled)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Usuários Vinculados</CardTitle>
              <CardDescription>Pessoas com acesso à conta da {company.name}</CardDescription>
            </CardHeader>
            <CardContent>
              {users.length > 0 ? (
                <div className="space-y-4">
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-3 border-b last:border-0"
                    >
                      <div>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-sm text-muted-foreground">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline">{u.role}</Badge>
                        <span className="text-xs text-muted-foreground w-24 text-right">
                          {u.lastLogin}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum usuário encontrado para esta empresa.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
