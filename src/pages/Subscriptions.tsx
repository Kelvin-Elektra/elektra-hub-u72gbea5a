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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import pb from '@/lib/pocketbase/client'
import { Eye, Search } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('active_trialing')
  const [search, setSearch] = useState('')

  const loadSubscriptions = async () => {
    try {
      setLoading(true)
      const records = await pb.collection('subscriptions').getFullList({
        expand: 'user_id,module_id',
        sort: '-created',
      })
      setSubscriptions(records)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSubscriptions()
  }, [])

  useRealtime('subscriptions', loadSubscriptions)

  const filteredSubs = subscriptions.filter((sub) => {
    let matchStatus = true
    if (statusFilter === 'active_trialing') {
      matchStatus = sub.status === 'active' || sub.status === 'trialing'
    } else if (statusFilter !== 'all') {
      matchStatus = sub.status === statusFilter
    }

    let matchSearch = true
    if (search) {
      const s = search.toLowerCase()
      matchSearch =
        sub.expand?.user_id?.email?.toLowerCase().includes(s) ||
        sub.expand?.user_id?.name?.toLowerCase().includes(s) ||
        sub.expand?.module_id?.name?.toLowerCase().includes(s)
    }

    return matchStatus && matchSearch
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assinaturas</h1>
        <p className="text-muted-foreground">Gerencie as assinaturas dos clientes.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por e-mail, cliente ou módulo..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-[200px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active_trialing">Ativas e Trial</SelectItem>
                  <SelectItem value="active">Ativas</SelectItem>
                  <SelectItem value="trialing">Trial</SelectItem>
                  <SelectItem value="overdue">Em Atraso</SelectItem>
                  <SelectItem value="canceled">Canceladas</SelectItem>
                  <SelectItem value="all">Todas</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                <TableHead>Usuários (Max)</TableHead>
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
                filteredSubs.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div className="font-medium">{sub.expand?.user_id?.name || 'Sem nome'}</div>
                      <div className="text-xs text-muted-foreground">
                        {sub.expand?.user_id?.email}
                      </div>
                    </TableCell>
                    <TableCell>{sub.expand?.module_id?.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          sub.status === 'active'
                            ? 'default'
                            : sub.status === 'canceled'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell>R$ {sub.price?.toFixed(2).replace('.', ',') || '0,00'}</TableCell>
                    <TableCell>{sub.max_users || 1}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/admin/assinaturas/${sub.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
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
