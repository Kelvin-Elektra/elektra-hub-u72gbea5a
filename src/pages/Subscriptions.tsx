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

export default function Subscriptions() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadData = async () => {
    try {
      setLoading(true)
      const [usersRecords, subsRecords] = await Promise.all([
        pb.collection('users').getFullList({ filter: 'role="User"', sort: 'name' }),
        pb.collection('subscriptions').getFullList({ expand: 'module_id' }),
      ])

      const subsByUser = new Map()
      subsRecords.forEach((sub) => {
        if (!subsByUser.has(sub.user_id)) subsByUser.set(sub.user_id, [])
        subsByUser.get(sub.user_id).push(sub)
      })

      const enriched = usersRecords.map((u) => {
        const userSubs = subsByUser.get(u.id) || []
        const activeCount = userSubs.filter(
          (s: any) => s.status === 'active' || s.status === 'trialing',
        ).length
        return { ...u, activeCount, totalSubs: userSubs.length }
      })

      setUsers(enriched)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('users', loadData)
  useRealtime('subscriptions', loadData)

  const filteredUsers = users.filter((u) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      u.name?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s) ||
      u.company_name?.toLowerCase().includes(s)
    )
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Clientes e Assinaturas</h1>
        <p className="text-muted-foreground">
          Gerencie o acesso e assinaturas agrupadas por cliente.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium">Buscar Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail ou empresa..."
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
                <TableHead>Empresa</TableHead>
                <TableHead>Módulos Ativos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">{u.name || 'Sem nome'}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell>{u.company_name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={u.activeCount > 0 ? 'default' : 'secondary'}>
                        {u.activeCount} ativo(s)
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/admin/assinaturas/${u.id}`}>
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
