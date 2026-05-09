import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Building2, Plug, Users } from 'lucide-react'
import {
  getCompany,
  getCompanySubscriptions,
  getCompanyUsers,
  getModules,
  updateCompany,
  createSubscription,
  updateSubscription,
  type Company,
  type Subscription,
  type User,
  type Module,
} from '@/services/api'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { useRealtime } from '@/hooks/use-realtime'

export default function CompanyDetail() {
  const { id } = useParams()
  const [company, setCompany] = useState<Company | null>(null)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [companyForm, setCompanyForm] = useState<Partial<Company>>({})

  const loadData = async () => {
    if (!id) return
    try {
      const [comp, subs, mods, usrs] = await Promise.all([
        getCompany(id),
        getCompanySubscriptions(id),
        getModules(),
        getCompanyUsers(id),
      ])
      setCompany(comp)
      setCompanyForm(comp)
      setSubscriptions(subs)
      setModules(mods)
      setUsers(usrs)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])
  useRealtime('subscriptions', loadData)

  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <h2 className="text-2xl font-bold text-muted-foreground">Carregando...</h2>
      </div>
    )
  }

  const handleSaveCompany = async () => {
    try {
      await updateCompany(company.id, companyForm)
      toast.success('Empresa atualizada.')
      loadData()
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const handleToggleSubscription = async (modId: string, currentSub?: Subscription) => {
    try {
      if (currentSub) {
        const newStatus = currentSub.status === 'active' ? 'canceled' : 'active'
        await updateSubscription(currentSub.id, { status: newStatus })
        toast.success(
          `Acesso ${newStatus === 'active' ? 'restaurado' : 'revogado'}. Sincronizando...`,
        )
      } else {
        const mod = modules.find((m) => m.id === modId)
        await createSubscription({
          company_id: company.id,
          module_id: modId,
          status: 'active',
          price: mod?.base_price || 0,
        })
        toast.success('Módulo adicionado. Sincronizando...')
      }
      loadData()
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
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
              {company.tax_id || 'Sem documento'}
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
                  <Input
                    value={companyForm.name || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ / CPF</Label>
                  <Input
                    value={companyForm.tax_id || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, tax_id: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={companyForm.status}
                    onValueChange={(val: any) => setCompanyForm({ ...companyForm, status: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="mt-4" onClick={handleSaveCompany}>
                Salvar Alterações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modulos" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Sincronização de Módulos</CardTitle>
              <CardDescription>
                A alteração do status aqui refletirá em tempo real no banco de dados do respectivo
                módulo (Webhook).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {modules.map((mod) => {
                const sub = subscriptions.find((s) => s.module_id === mod.id)
                const isActive = sub?.status === 'active'
                return (
                  <div
                    key={mod.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-card shadow-sm"
                  >
                    <div className="space-y-1">
                      <h4 className="font-semibold flex items-center gap-2">
                        {mod.name}
                        {isActive ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-600 border-emerald-200"
                          >
                            Ativo
                          </Badge>
                        ) : sub ? (
                          <Badge
                            variant="outline"
                            className="bg-amber-500/10 text-amber-600 border-amber-200"
                          >
                            {sub.status}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-muted text-muted-foreground">
                            Não Assinado
                          </Badge>
                        )}
                      </h4>
                      <p
                        className="text-sm text-muted-foreground truncate max-w-sm"
                        title={mod.endpoint_url}
                      >
                        Webhook: {mod.endpoint_url || 'Não configurado'}
                      </p>
                    </div>
                    <Button
                      variant={isActive ? 'destructive' : 'default'}
                      onClick={() => handleToggleSubscription(mod.id, sub)}
                    >
                      {isActive ? 'Revogar Acesso' : 'Conceder Acesso'}
                    </Button>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Usuários Vinculados</CardTitle>
              <CardDescription>Contas que pertencem a {company.name}</CardDescription>
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
                        <p className="font-medium">{u.name || 'Sem nome'}</p>
                        <p className="text-sm text-muted-foreground">{u.email}</p>
                      </div>
                      <Badge variant="outline">{u.role}</Badge>
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
