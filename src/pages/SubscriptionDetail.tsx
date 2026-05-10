import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, User as UserIcon, Plug, CreditCard } from 'lucide-react'
import {
  getUser,
  getUserSubscriptions,
  getModules,
  createSubscription,
  updateSubscription,
  type User,
  type Subscription,
  type Module,
} from '@/services/api'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { useRealtime } from '@/hooks/use-realtime'

export default function SubscriptionDetail() {
  const { id } = useParams()
  const [client, setClient] = useState<User | null>(null)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [modules, setModules] = useState<Module[]>([])

  const loadData = async () => {
    if (!id) return
    try {
      const [u, subs, mods] = await Promise.all([
        getUser(id),
        getUserSubscriptions(id),
        getModules(),
      ])
      setClient(u)
      setSubscriptions(subs)
      setModules(mods)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])
  useRealtime('subscriptions', loadData)

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <h2 className="text-2xl font-bold text-muted-foreground">Carregando...</h2>
      </div>
    )
  }

  const handleToggleSubscription = async (modId: string, currentSub?: Subscription) => {
    try {
      if (currentSub) {
        const newStatus = currentSub.status === 'active' ? 'canceled' : 'active'
        await updateSubscription(currentSub.id, { status: newStatus })
        toast.success(`Acesso ${newStatus === 'active' ? 'restaurado' : 'revogado'}.`)
      } else {
        const mod = modules.find((m) => m.id === modId)
        await createSubscription({
          user_id: client.id,
          module_id: modId,
          status: 'active',
          price: mod?.base_price || 0,
        })
        toast.success('Módulo ativado para este cliente.')
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
          <Link to="/admin/assinaturas">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {client.person_type === 'PJ' ? client.company_name : client.name}
          </h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
              {client.tax_id || 'Sem documento'}
            </span>
            • Cadastrado em {new Date(client.created).toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" /> Dados do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <span className="text-muted-foreground">Nome:</span>
                <p className="font-medium">{client.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p className="font-medium">{client.email}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Tipo:</span>
                <p className="font-medium">{client.person_type}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Endereço:</span>
                <p className="font-medium">
                  {client.address}, {client.address_number}
                  {client.complement && ` - ${client.complement}`}
                  <br />
                  {client.neighborhood} - {client.city}/{client.state}
                  <br />
                  CEP: {client.postal_code}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plug className="h-5 w-5" /> Módulos e Assinaturas
              </CardTitle>
              <CardDescription>
                Controle o acesso deste cliente aos módulos disponíveis no Hub.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {modules.map((mod) => {
                const sub = subscriptions.find((s) => s.module_id === mod.id)
                const isActive = sub?.status === 'active'
                return (
                  <div
                    key={mod.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg bg-card shadow-sm gap-4"
                  >
                    <div className="space-y-2 flex-1">
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

                      {sub && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2 bg-muted/40 p-2 rounded border">
                          <div className="flex items-center gap-1">
                            <CreditCard className="h-3 w-3" />
                            <strong>Customer ID:</strong> {sub.asaas_customer_id || 'N/A'}
                          </div>
                          <div className="flex items-center gap-1">
                            <CreditCard className="h-3 w-3" />
                            <strong>Subscription ID:</strong> {sub.asaas_subscription_id || 'N/A'}
                          </div>
                        </div>
                      )}
                    </div>

                    <Button
                      variant={isActive ? 'destructive' : 'default'}
                      onClick={() => handleToggleSubscription(mod.id, sub)}
                      className="w-full sm:w-auto shrink-0"
                    >
                      {isActive ? 'Bloquear Acesso' : 'Ativar Acesso'}
                    </Button>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
