import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, Users, AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import {
  getCompanies,
  getSubscriptions,
  getSyncLogs,
  type Company,
  type Subscription,
  type SyncLog,
} from '@/services/api'
import { useRealtime } from '@/hooks/use-realtime'

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

export default function Index() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([])

  const loadData = async () => {
    try {
      const [comps, subs, logs] = await Promise.all([
        getCompanies(),
        getSubscriptions(),
        getSyncLogs(),
      ])
      setCompanies(comps)
      setSubscriptions(subs)
      setSyncLogs(logs.slice(0, 10))
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('companies', loadData)
  useRealtime('subscriptions', loadData)
  useRealtime('sync_logs', loadData)

  const activeSubs = subscriptions.filter((s) => s.status === 'active')
  const totalMrr = activeSubs.reduce((acc, curr) => acc + (curr.price || 0), 0)
  const activeCompanies = companies.filter((c) => c.status === 'active').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Painel de Controle</h1>
        <p className="text-muted-foreground">Visão geral do ecossistema e integrações.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(totalMrr)}</div>
            <p className="text-xs text-muted-foreground mt-1">Soma de assinaturas ativas</p>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas Ativas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCompanies}</div>
            <p className="text-xs text-muted-foreground mt-1">Total: {companies.length}</p>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinaturas</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSubs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Módulos ativos no Hub</p>
          </CardContent>
        </Card>
      </div>

      <Card className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <CardHeader>
          <CardTitle>Logs de Sincronização Recentes</CardTitle>
          <CardDescription>Eventos de webhook para os módulos.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {syncLogs.length > 0 ? (
              syncLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 border-b last:border-0 pb-4 last:pb-0"
                >
                  <div className="mt-0.5 shrink-0">
                    {log.status === 'success' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                  </div>
                  <div className="grid gap-1 flex-1">
                    <p className="text-sm font-medium leading-none">
                      Sincronização do módulo{' '}
                      {log.expand?.subscription_id?.expand?.module_id?.name || 'Desconhecido'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Empresa: {log.expand?.subscription_id?.expand?.company_id?.name || '-'}
                    </p>
                    {log.error_message && (
                      <p className="text-xs text-destructive">{log.error_message}</p>
                    )}
                  </div>
                  <div className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.created).toLocaleString('pt-BR')}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-4">Nenhum log encontrado.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
