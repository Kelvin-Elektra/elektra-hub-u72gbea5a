import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import pb from '@/lib/pocketbase/client'
import { Eye, Search } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadData = async () => {
    try {
      setLoading(true)
      const subsRecords = await pb.collection('subscriptions').getFullList({
        expand: 'user_id,module_id',
        sort: '-created',
      })
      setSubscriptions(subsRecords)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('subscriptions', loadData)

  const filteredSubs = subscriptions.filter((s) => {
    if (!search) return true
    const sTerm = search.toLowerCase()
    const userName = s.expand?.user_id?.name?.toLowerCase() || ''
    const compName = s.expand?.user_id?.company_name?.toLowerCase() || ''
    const moduleName = s.expand?.module_id?.name?.toLowerCase() || ''
    return userName.includes(sTerm) || compName.includes(sTerm) || moduleName.includes(sTerm)
  })

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

  const translateStatus = (status: string) => {
    const map: Record<string, string> = {
      trialing: 'Período de Teste',
      active: 'Ativo',
      overdue: 'Em Atraso',
      canceled: 'Cancelado',
    }
    return map[status] || status
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assinaturas</h1>
        <p className="text-muted-foreground">
          Gerencie o acesso e assinaturas de todos os clientes.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium">Buscar Assinaturas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente ou módulo..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Próx. Faturamento</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredSubs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma assinatura encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubs.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-medium">
                        {s.expand?.user_id?.company_name || s.expand?.user_id?.name || 'Sem nome'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {s.expand?.user_id?.email}
                      </div>
                    </TableCell>
                    <TableCell>{s.expand?.module_id?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(s.status)}>
                        {translateStatus(s.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {s.price !== undefined && s.price !== null
                        ? new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(s.price)
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {s.next_billing_date
                        ? format(new Date(s.next_billing_date), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {s.expand?.user_id?.id && (
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/admin/assinaturas/${s.expand.user_id.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
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
