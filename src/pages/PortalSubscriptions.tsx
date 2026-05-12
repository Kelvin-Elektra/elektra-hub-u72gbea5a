import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function PortalSubscriptions() {
  const { user } = useAuth()
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    if (!user) return
    try {
      setLoading(true)

      const subs = await pb.collection('subscriptions').getFullList({
        filter: `user_id = "${user.id}"`,
        expand: 'module_id',
        sort: '-created',
      })
      setSubscriptions(subs)

      if (subs.length > 0) {
        const filterStr = subs.map((s) => `subscription_id = "${s.id}"`).join(' || ')
        const syncLogs = await pb.collection('sync_logs').getFullList({
          filter: filterStr,
          expand: 'subscription_id.module_id',
          sort: '-created',
        })
        setLogs(syncLogs)
      } else {
        setLogs([])
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  const translateStatus = (status: string) => {
    const map: Record<string, string> = {
      trialing: 'Período de Teste',
      active: 'Ativo',
      overdue: 'Em Atraso',
      canceled: 'Cancelado',
    }
    return map[status] || status
  }

  const getStatusVariant = (
    status: string,
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'active':
        return 'default'
      case 'trialing':
        return 'secondary'
      case 'overdue':
        return 'destructive'
      case 'canceled':
        return 'outline'
      default:
        return 'outline'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assinaturas</h1>
        <p className="text-muted-foreground">
          Consulte o histórico e detalhes das suas assinaturas ativas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Meus Módulos</CardTitle>
          <CardDescription>Módulos do sistema contratados para a sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Módulo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Próxima Fatura</TableHead>
                <TableHead>Lim. Usuários</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : subscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhuma assinatura encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">
                      {sub.expand?.module_id?.name || 'Módulo Desconhecido'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(sub.status)}>
                        {translateStatus(sub.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sub.next_billing_date
                        ? format(new Date(sub.next_billing_date), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'}
                    </TableCell>
                    <TableCell>{sub.max_users || 'Ilimitado'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Sincronização / Logs</CardTitle>
          <CardDescription>Eventos recentes de integração com os módulos.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Mensagem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhum log encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(log.created), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {log.expand?.subscription_id?.expand?.module_id?.name || 'Desconhecido'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                        {log.status === 'success' ? 'Sucesso' : 'Falha'}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className="text-muted-foreground text-sm max-w-[300px] truncate"
                      title={log.error_message}
                    >
                      {log.error_message || 'Sincronização concluída com sucesso'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
