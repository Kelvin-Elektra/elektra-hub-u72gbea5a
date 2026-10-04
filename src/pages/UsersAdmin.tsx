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
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Plus, Edit2, Archive, ArchiveRestore } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import pb from '@/lib/pocketbase/client'

export default function UsersAdmin() {
  const [searchTerm, setSearchTerm] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [createData, setCreateData] = useState<any>({
    name: '',
    email: '',
    role: 'User_employee',
    company_id: '',
    phone: '',
    password: '',
    passwordConfirm: '',
  })
  const [editData, setEditData] = useState<any>({
    name: '',
    role: 'User_employee',
    company_id: '',
    phone: '',
  })
  const [loading, setLoading] = useState(false)
  const [deactivateConfirmId, setDeactivateConfirmId] = useState<string | null>(null)
  const [tab, setTab] = useState('active')

  const loadData = async () => {
    try {
      const [usrData, compData] = await Promise.all([
        pb.collection('users').getFullList({ sort: '-created' }),
        pb.collection('companies').getFullList({ sort: 'name' }),
      ])
      setUsers(usrData)
      setCompanies(compData)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('users', loadData)
  useRealtime('companies', loadData)

  const companiesMap = companies.reduce(
    (acc, comp) => {
      acc[comp.id] = comp.name
      return acc
    },
    {} as Record<string, string>,
  )

  const filteredUsers = users.filter((u) => {
    const compNameFromId = u.company_id ? companiesMap[u.company_id] || '' : ''
    const matchesSearch =
      (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      compNameFromId.toLowerCase().includes(searchTerm.toLowerCase())

    const isActive = u.active === true
    if (tab === 'active') return matchesSearch && isActive
    return matchesSearch && !isActive
  })

  const handleCreate = async () => {
    if (!createData.name || !createData.email || !createData.password) {
      toast.error('Preencha os campos obrigatórios (Nome, E-mail, Senha).')
      return
    }
    if (createData.password !== createData.passwordConfirm) {
      toast.error('As senhas não coincidem.')
      return
    }

    setLoading(true)
    try {
      const selectedCompany = companies.find((c) => c.id === createData.company_id)
      const dataToSubmit = {
        name: createData.name,
        email: createData.email,
        role: createData.role || 'User_employee',
        company_id: createData.company_id || '',
        company_name: selectedCompany ? selectedCompany.name : '',
        phone: createData.phone || '',
        password: createData.password,
        passwordConfirm: createData.passwordConfirm,
        active: true,
      }
      await pb.collection('users').create(dataToSubmit)
      toast.success('Usuário criado com sucesso.')
      setIsCreateOpen(false)
      setCreateData({
        name: '',
        email: '',
        role: 'User_employee',
        company_id: '',
        phone: '',
        password: '',
        passwordConfirm: '',
      })
      loadData()
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
    setLoading(false)
  }

  const openEdit = (user: any) => {
    setEditingUser(user)
    setEditData({
      name: user.name || '',
      role: user.role || 'User_employee',
      company_id: user.company_id || '',
      phone: user.phone || '',
    })
    setIsEditOpen(true)
  }

  const handleEdit = async () => {
    if (!editingUser) return
    if (!editData.name) {
      toast.error('O nome é obrigatório.')
      return
    }

    setLoading(true)
    try {
      const selectedCompany = companies.find((c) => c.id === editData.company_id)
      const dataToUpdate: any = {
        name: editData.name,
        role: editData.role,
        company_id: editData.company_id || '',
        company_name: selectedCompany ? selectedCompany.name : '',
        phone: editData.phone || '',
      }
      await pb.collection('users').update(editingUser.id, dataToUpdate)
      toast.success('Usuário atualizado com sucesso.')
      setIsEditOpen(false)
      setEditingUser(null)
      loadData()
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
    setLoading(false)
  }

  const handleToggleActive = async (id: string, makeActive: boolean) => {
    try {
      await pb.collection('users').update(id, { active: makeActive })
      toast.success(
        makeActive ? 'Usuário reativado com sucesso.' : 'Usuário desativado com sucesso.',
      )
      setDeactivateConfirmId(null)
      loadData()
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'Admin':
        return <Badge variant="default">Administrador</Badge>
      case 'User_owner':
        return <Badge variant="secondary">Proprietário (User_owner)</Badge>
      case 'User_employee':
      default:
        return <Badge variant="outline">Funcionário (User_employee)</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground">
            Listagem geral de todos os membros do ecossistema e vínculo com suas companhias.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Usuário
        </Button>
      </div>

      <Card>
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
          <Tabs value={tab} onValueChange={setTab} className="w-[400px]">
            <TabsList>
              <TabsTrigger value="active">Ativos</TabsTrigger>
              <TabsTrigger value="inactive">Inativos</TabsTrigger>
            </TabsList>
          </Tabs>

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
              <TableHead>Companhia (Empresa)</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{u.name || 'Sem Nome'}</span>
                      <span className="text-xs text-muted-foreground">{u.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {u.company_id && companiesMap[u.company_id] ? (
                      <span className="font-medium text-primary">{companiesMap[u.company_id]}</span>
                    ) : u.company_name ? (
                      <span className="font-medium">{u.company_name}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Sem companhia</span>
                    )}
                  </TableCell>
                  <TableCell>{getRoleBadge(u.role)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.phone || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(u)}
                        className="hover:bg-primary/10 hover:text-primary transition-colors"
                        title="Editar usuário"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>

                      {tab === 'active' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeactivateConfirmId(u.id)}
                          className="text-destructive hover:bg-destructive/10 transition-colors"
                          title="Desativar usuário"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(u.id, true)}
                          className="text-green-600 hover:bg-green-600/10 transition-colors"
                          title="Reativar usuário"
                        >
                          <ArchiveRestore className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
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

      {/* Modal Criar Usuário */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={createData.name}
                  onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                  placeholder="Nome do usuário"
                />
              </div>
              <div className="space-y-2">
                <Label>Papel</Label>
                <Select
                  value={createData.role}
                  onValueChange={(val: any) => setCreateData({ ...createData, role: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Administrador</SelectItem>
                    <SelectItem value="User_owner">Proprietário (User_owner)</SelectItem>
                    <SelectItem value="User_employee">Funcionário (User_employee)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Companhia (Empresa)</Label>
              <Select
                value={createData.company_id || 'none'}
                onValueChange={(val: string) =>
                  setCreateData({ ...createData, company_id: val === 'none' ? '' : val })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma empresa</SelectItem>
                  {companies.map((comp) => (
                    <SelectItem key={comp.id} value={comp.id}>
                      {comp.name} {comp.tax_id ? `(${comp.tax_id})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>E-mail *</Label>
                <Input
                  type="email"
                  value={createData.email}
                  onChange={(e) => setCreateData({ ...createData, email: e.target.value })}
                  placeholder="usuario@empresa.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={createData.phone}
                  onChange={(e) => setCreateData({ ...createData, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Senha *</Label>
                <Input
                  type="password"
                  value={createData.password}
                  onChange={(e) => setCreateData({ ...createData, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirmar Senha *</Label>
                <Input
                  type="password"
                  value={createData.passwordConfirm}
                  onChange={(e) =>
                    setCreateData({ ...createData, passwordConfirm: e.target.value })
                  }
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Usuário */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input value={editingUser?.email || ''} disabled className="bg-muted" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  placeholder="Nome do usuário"
                />
              </div>
              <div className="space-y-2">
                <Label>Papel</Label>
                <Select
                  value={editData.role}
                  onValueChange={(val: any) => setEditData({ ...editData, role: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Administrador</SelectItem>
                    <SelectItem value="User_owner">Proprietário (User_owner)</SelectItem>
                    <SelectItem value="User_employee">Funcionário (User_employee)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Companhia (Empresa)</Label>
              <Select
                value={editData.company_id || 'none'}
                onValueChange={(val: string) =>
                  setEditData({ ...editData, company_id: val === 'none' ? '' : val })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma empresa</SelectItem>
                  {companies.map((comp) => (
                    <SelectItem key={comp.id} value={comp.id}>
                      {comp.name} {comp.tax_id ? `(${comp.tax_id})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={editData.phone}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={loading}>
              {loading ? 'Salvando...' : 'Atualizar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de desativação */}
      <Dialog
        open={!!deactivateConfirmId}
        onOpenChange={(open) => !open && setDeactivateConfirmId(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Desativar Usuário</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja desativar este usuário? A revogação será sincronizada
              automaticamente com todos os módulos SaaS vinculados.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateConfirmId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deactivateConfirmId && handleToggleActive(deactivateConfirmId, false)}
            >
              Desativar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
