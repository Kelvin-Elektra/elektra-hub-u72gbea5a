import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Search, SlidersHorizontal, Eye } from 'lucide-react'
import { mockCompanies } from '@/lib/data'
import { cn } from '@/lib/utils'

export default function Companies() {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredCompanies = mockCompanies.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.plan.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      Ativo: 'bg-emerald-500/15 text-emerald-700 border-transparent',
      Inadimplente: 'bg-amber-500/15 text-amber-700 border-transparent',
      Cancelado: 'bg-red-500/15 text-red-700 border-transparent',
      Bloqueado: 'bg-red-500/15 text-red-700 border-transparent',
    }
    return (
      <Badge
        className={cn(colors[status] || 'bg-muted', 'font-medium hover:bg-opacity-20')}
        variant="outline"
      >
        {status}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Empresas</h1>
          <p className="text-muted-foreground">
            Gerencie o acesso e a situação financeira dos seus clientes.
          </p>
        </div>
        <Button>Adicionar Empresa</Button>
      </div>

      <Card>
        <div className="p-4 flex items-center justify-between border-b">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou plano..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" className="hidden sm:flex gap-2">
            <SlidersHorizontal className="h-4 w-4" /> Filtros
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Empresa</TableHead>
              <TableHead>Plano (MRR)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Módulos Ativos</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCompanies.length > 0 ? (
              filteredCompanies.map((company) => (
                <TableRow key={company.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{company.name}</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        {company.document}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{company.plan}</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(company.mrr)}
                        /mês
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(company.status)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {company.modules.length > 0 ? (
                        company.modules.map((m, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="text-[10px] bg-primary/10 text-primary hover:bg-primary/20"
                          >
                            {m}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      className="hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      <Link to={`/empresas/${company.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Nenhuma empresa encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
