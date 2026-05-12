import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import pb from '@/lib/pocketbase/client'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Edit2, ShieldAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function SubscriptionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [modules, setModules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Edit sub state
  const [editingSub, setEditingSub] = useState<any>(null)
  const [editStatus, setEditStatus] = useState('')
  const [editMaxUsers, setEditMaxUsers] = useState(1)

  // New sub state
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [newModuleId, setNewModuleId] = useState('')
  const [newMaxUsers, setNewMaxUsers] = useState(1)
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    try {
      if (!id) return
      setLoading(true)
      const [u, subs, mods] = await Promise.all([
        pb.collection('users').getOne(id),
        pb
          .collection('subscriptions')
          .getFullList({ filter: `user_id="${id}"`, expand: 'module_id' }),
        pb.collection('modules').getFullList(),
      ])
      setUser(u)
      setSubscriptions(subs)
      setModules(mods)
    } catch (err) {
      toast.error('Erro ao carregar detalhes')
      navigate('/admin/assinaturas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  const handleUpdateSub = async () => {
    try {
      setSaving(true)
      await pb.collection('subscriptions').update(editingSub.id, {
        status: editStatus,
        max_users: editMaxUsers,
      })
      toast.success('Assinatura atualizada!')
      setEditingSub(null)
      loadData()
    } catch (err) {
      toast.error('Erro ao atualizar')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateSub = async () => {
    try {
      if (!newModuleId) {
        toast.error('Selecione um módulo')
        return
      }
      setSaving(true)

      const mod = modules.find((m) => m.id === newModuleId)

      await pb.collection('subscriptions').create({
        user_id: user.id,
        module_id: newModuleId,
        status: 'active',
        max_users: newMaxUsers,
        price: mod?.base_price || 0,
      })
      toast.success('Acesso concedido com sucesso!')
      setIsNewOpen(false)
      setNewModuleId('')
      setNewMaxUsers(1)
      loadData()
    } catch (err) {
      toast.error('Erro ao conceder acesso')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !user) {
    return <div className="p-8 text-center text-muted-foreground">Carregando...</div>
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/admin/assinaturas')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Detalhes do Cliente</h1>
          <p className="text-muted-foreground">{user.name || 'Sem nome'}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Informações do Cliente</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-muted-foreground">Nome</Label>
            <div className="font-medium">{user.name || 'N/A'}</div>
          </div>
          <div>
            <Label className="text-muted-foreground">E-mail</Label>
            <div className="font-medium">{user.email || 'N/A'}</div>
          </div>
          <div>
            <Label className="text-muted-foreground">Empresa</Label>
            <div className="font-medium">{user.company_name || 'N/A'}</div>
          </div>
          <div>
            <Label className="text-muted-foreground">Documento (CPF/CNPJ)</Label>
            <div className="font-medium">{user.tax_id || 'N/A'}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Assinaturas do Cliente</CardTitle>
            <CardDescription>Gerencie os módulos ativados para este cliente</CardDescription>
          </div>
          <Button onClick={() => setIsNewOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Ativar Acesso Manual
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Módulo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Lim. Usuários</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    Nenhuma assinatura ativa.
                  </TableCell>
                </TableRow>
              ) : (
                subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">
                      {sub.expand?.module_id?.name || 'Módulo Removido'}
                    </TableCell>
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingSub(sub)
                          setEditStatus(sub.status)
                          setEditMaxUsers(sub.max_users || 1)
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Sub Dialog */}
      <Dialog open={!!editingSub} onOpenChange={(val) => !val && setEditingSub(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Assinatura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Módulo</Label>
              <Input value={editingSub?.expand?.module_id?.name || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="trialing">Trial</SelectItem>
                  <SelectItem value="overdue">Atrasada</SelectItem>
                  <SelectItem value="canceled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Limite de Usuários (max_users)</Label>
              <Input
                type="number"
                min={1}
                value={editMaxUsers}
                onChange={(e) => setEditMaxUsers(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSub(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateSub} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Sub Dialog */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ativar Acesso Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-amber-50 text-amber-800 p-3 rounded-md flex items-start gap-2 text-sm">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <p>
                Você está concedendo acesso manual. Isso criará uma assinatura ativa imediatamente e
                disparará o webhook de provisão.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Selecione o Módulo</Label>
              <Select value={newModuleId} onValueChange={setNewModuleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um módulo..." />
                </SelectTrigger>
                <SelectContent>
                  {modules
                    .filter((m) => !subscriptions.some((s) => s.module_id === m.id))
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Limite de Usuários (max_users)</Label>
              <Input
                type="number"
                min={1}
                value={newMaxUsers}
                onChange={(e) => setNewMaxUsers(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateSub} disabled={saving || !newModuleId}>
              {saving ? 'Salvando...' : 'Confirmar Acesso'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
