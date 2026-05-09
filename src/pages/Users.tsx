import { useState } from 'react'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { mockUsers } from '@/lib/data'

export default function Users() {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredUsers = mockUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.companyName.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestão de Usuários</h1>
        <p className="text-muted-foreground">Visão global de todos os usuários do ecossistema.</p>
      </div>

      <Card>
        <div className="p-4 border-b">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Usuário</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Nível de Acesso</TableHead>
              <TableHead>Último Login</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>{user.companyName}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        user.role === 'Admin' ? 'bg-primary/10 text-primary border-primary/20' : ''
                      }
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{user.lastLogin}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1.5 text-sm font-medium ${user.status === 'Ativo' ? 'text-emerald-600' : 'text-muted-foreground'}`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${user.status === 'Ativo' ? 'bg-emerald-500' : 'bg-muted-foreground'}`}
                      ></span>
                      {user.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
