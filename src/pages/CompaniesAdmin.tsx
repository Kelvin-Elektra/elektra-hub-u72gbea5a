import { useEffect, useState } from 'react'
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
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Plus, Edit, Building2, Archive, ArchiveRestore } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import pb from '@/lib/pocketbase/client'

export interface CompanyRecord {
  id: string
  name: string
  tax_id?: string
  status: 'active' | 'inactive'
  address?: string
  address_number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  postal_code?: string
  phone?: string
  created: string
  updated: string
}

export default function CompaniesAdmin() {
  const [searchTerm, setSearchTerm] = useState('')
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [usersCountByCompany, setUsersCountByCompany] = useState<Record<string, number>>({})
  const [isOpen, setIsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentId, setCurrentId] = useState('')
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('active')
  const [deactivateConfirmId, setDeactivateConfirmId] = useState<string | null>(null)

  const initialForm = {
    name: '',
    tax_id: '',
    status: 'active' as 'active' | 'inactive',
    postal_code: '',
    address: '',
    address_number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    phone: '',
  }
  const [formData, setFormData] = useState(initialForm)

  const loadData = async () => {
    try {
      const [comps, users] = await Promise.all([
        pb.collection('companies').getFullList<CompanyRecord>({ sort: '-created' }),
        pb.collection('users').getFullList({ fields: 'id,company_id' }),
      ])
      setCompanies(comps)

      const counts: Record<string, number> = {}
      users.forEach((u: any) => {
        if (u.company_id) {
          counts[u.company_id] = (counts[u.company_id] || 0) + 1
        }
      })
      setUsersCountByCompany(counts)
    } catch (e) {
      console.error('Erro ao carregar empresas:', e)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('companies', loadData)
  useRealtime('users', loadData)

  const formatCnpj = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 14)
    if (raw.length <= 2) return raw
    if (raw.length <= 5) return `${raw.slice(0, 2)}.${raw.slice(2)}`
    if (raw.length <= 8) return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5)}`
    if (raw.length <= 12)
      return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8)}`
    return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8, 12)}-${raw.slice(12, 14)}`
  }

  const formatCep = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 8)
    if (raw.length <= 5) return raw
    return `${raw.slice(0, 5)}-${raw.slice(5, 8)}`
  }

  const handleCepLookup = async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, '')
    setFormData((prev) => ({ ...prev, postal_code: formatCep(cepValue) }))
    if (cleanCep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
        const data = await res.json()
        if (!data.erro) {
          setFormData((prev) => ({
            ...prev,
            address: data.logradouro || prev.address,
            neighborhood: data.bairro || prev.neighborhood,
            city: data.localidade || prev.city,
            state: data.uf || prev.state,
            complement: data.complemento || prev.complement,
          }))
        }
      } catch (err) {
        console.error('Erro ao buscar CEP:', err)
      }
    }
  }

  const handleOpenNew = () => {
    setIsEditing(false)
    setCurrentId('')
    setFormData(initialForm)
    setIsOpen(true)
  }

  const handleOpenEdit = (comp: CompanyRecord) => {
    setIsEditing(true)
    setCurrentId(comp.id)
    setFormData({
      name: comp.name || '',
      tax_id: comp.tax_id ? formatCnpj(comp.tax_id) : '',
      status: comp.status || 'active',
      postal_code: comp.postal_code ? formatCep(comp.postal_code) : '',
      address: comp.address || '',
      address_number: comp.address_number || '',
      complement: comp.complement || '',
      neighborhood: comp.neighborhood || '',
      city: comp.city || '',
      state: comp.state || '',
      phone: comp.phone || '',
    })
    setIsOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('O nome da empresa é obrigatório.')
      return
    }

    setLoading(true)
    try {
      const payload = {
        name: formData.name.trim(),
        tax_id: formData.tax_id ? formData.tax_id.replace(/\D/g, '') : '',
        status: formData.status,
        postal_code: formData.postal_code ? formData.postal_code.replace(/\D/g, '') : '',
        address: formData.address.trim(),
        address_number: formData.address_number.trim(),
        complement: formData.complement.trim(),
        neighborhood: formData.neighborhood.trim(),
        city: formData.city.trim(),
        state: formData.state.trim().toUpperCase(),
        phone: formData.phone.trim(),
      }

      if (isEditing) {
        await pb.collection('companies').update(currentId, payload)
        toast.success('Empresa atualizada com sucesso!')
      } else {
        await pb.collection('companies').create(payload)
        toast.success('Empresa criada com sucesso!')
      }
      setIsOpen(false)
      loadData()
    } catch (err: any) {
      toast.error(getErrorMessage(err) || 'Erro ao salvar empresa')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (id: string, newStatus: 'active' | 'inactive') => {
    try {
      await pb.collection('companies').update(id, { status: newStatus })
      toast.success(
        newStatus === 'active' ? 'Empresa ativada com sucesso.' : 'Empresa desativada com sucesso.',
      )
      setDeactivateConfirmId(null)
      loadData()
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const filteredCompanies = companies.filter((c) => {
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      (c.name || '').toLowerCase().includes(term) ||
      (c.tax_id || '').includes(term) ||
      (c.city || '').toLowerCase().includes(term) ||
      (c.state || '').toLowerCase().includes(term)

    const isActive = c.status === 'active'
    if (tab === 'active') return matchesSearch && isActive
    return matchesSearch && !isActive
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Empresas</h1>
          <p className="text-muted-foreground">
            Gerencie as empresas cadastradas no ecossistema Elektra HUB.
          </p>
        </div>
        <Button onClick={handleOpenNew} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Empresa
        </Button>
      </div>

      <Card>
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
          <Tabs value={tab} onValueChange={setTab} className="w-[300px]">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="active">
                Ativas ({companies.filter((c) => c.status === 'active').length})
              </TabsTrigger>
              <TabsTrigger value="inactive">
                Inativas ({companies.filter((c) => c.status !== 'active').length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CNPJ, cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Empresa</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead>Usuários vinculados</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criada em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCompanies.length > 0 ? (
              filteredCompanies.map((comp) => {
                const userCount = usersCountByCompany[comp.id] || 0
                return (
                  <TableRow key={comp.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{comp.name}</span>
                          {comp.phone && (
                            <span className="text-xs text-muted-foreground">{comp.phone}</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono text-muted-foreground">
                        {comp.tax_id ? formatCnpj(comp.tax_id) : '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {comp.city || comp.state ? (
                        <span className="text-sm">
                          {[comp.city, comp.state].filter(Boolean).join(' - ')}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {userCount} {userCount === 1 ? 'usuário' : 'usuários'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={comp.status === 'active' ? 'default' : 'outline'}>
                        {comp.status === 'active' ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(comp.created).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(comp)}
                          className="hover:bg-primary/10 hover:text-primary transition-colors"
                          title="Editar empresa"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        {comp.status === 'active' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeactivateConfirmId(comp.id)}
                            className="text-destructive hover:bg-destructive/10 transition-colors"
                            title="Desativar empresa"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(comp.id, 'active')}
                            className="text-green-600 hover:bg-green-600/10 transition-colors"
                            title="Reativar empresa"
                          >
                            <ArchiveRestore className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Nenhuma empresa encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Dialog Criar / Editar Empresa */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
              <DialogDescription>
                Preencha as informações cadastrais e de endereço da empresa.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="comp-name">
                  Nome da Empresa <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="comp-name"
                  placeholder="Ex: Minha Empresa Solar Ltda"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="comp-cnpj">CNPJ</Label>
                  <Input
                    id="comp-cnpj"
                    placeholder="00.000.000/0001-00"
                    value={formData.tax_id}
                    onChange={(e) =>
                      setFormData({ ...formData, tax_id: formatCnpj(e.target.value) })
                    }
                    maxLength={18}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comp-phone">Telefone / Celular</Label>
                  <Input
                    id="comp-phone"
                    placeholder="(00) 00000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comp-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val: 'active' | 'inactive') =>
                    setFormData({ ...formData, status: val })
                  }
                >
                  <SelectTrigger id="comp-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativa</SelectItem>
                    <SelectItem value="inactive">Inativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-semibold text-foreground mb-3">Endereço</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="comp-cep">CEP</Label>
                    <Input
                      id="comp-cep"
                      placeholder="00000-000"
                      value={formData.postal_code}
                      onChange={(e) => handleCepLookup(e.target.value)}
                      maxLength={9}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="comp-address">Logradouro / Rua</Label>
                    <Input
                      id="comp-address"
                      placeholder="Rua Exemplo"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comp-number">Número</Label>
                    <Input
                      id="comp-number"
                      placeholder="123"
                      value={formData.address_number}
                      onChange={(e) => setFormData({ ...formData, address_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="comp-complement">Complemento</Label>
                    <Input
                      id="comp-complement"
                      placeholder="Sala 101, Bloco A"
                      value={formData.complement}
                      onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comp-neighborhood">Bairro</Label>
                    <Input
                      id="comp-neighborhood"
                      placeholder="Centro"
                      value={formData.neighborhood}
                      onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comp-city">Cidade</Label>
                    <Input
                      id="comp-city"
                      placeholder="São Paulo"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comp-state">Estado (UF)</Label>
                    <Input
                      id="comp-state"
                      placeholder="SP"
                      value={formData.state}
                      onChange={(e) =>
                        setFormData({ ...formData, state: e.target.value.toUpperCase() })
                      }
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : isEditing ? 'Atualizar Empresa' : 'Salvar Empresa'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmação Desativação */}
      <Dialog
        open={!!deactivateConfirmId}
        onOpenChange={(open) => !open && setDeactivateConfirmId(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Desativar Empresa</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja desativar esta empresa? Os usuários vinculados poderão ter o
              acesso restrito.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateConfirmId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deactivateConfirmId && handleToggleStatus(deactivateConfirmId, 'inactive')
              }
            >
              Desativar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
