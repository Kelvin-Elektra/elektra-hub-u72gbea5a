import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { UserPlus, Shield, Trash2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'

export default function Team() {
  const { user } = useAuth()
  const [employees, setEmployees] = useState<any[]>([])
  const [modules, setModules] = useState<any[]>([])
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [employeeAccess, setEmployeeAccess] = useState<any[]>([])

  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePhone, setInvitePhone] = useState('')
  const [isInviting, setIsInviting] = useState(false)

  const [manageUser, setManageUser] = useState<any>(null)

  const loadData = async () => {
    if (!user || !user.company_id) return
    try {
      const [emps, mods, subs, access] = await Promise.all([
        pb.collection('users').getFullList({
          filter: `company_id = "${user.company_id}" && role = "User_employee" && active = true`,
        }),
        pb.collection('modules').getFullList({ filter: 'status = "active"' }),
        pb
          .collection('subscriptions')
          .getFullList({ filter: `user_id = "${user.id}" && status = "active"` }),
        pb
          .collection('employee_access')
          .getFullList({ filter: `company_id = "${user.company_id}"` }),
      ])
      setEmployees(emps)
      setModules(mods)
      setSubscriptions(subs)
      setEmployeeAccess(access)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsInviting(true)
    try {
      await pb.send('/backend/v1/invite-employee', {
        method: 'POST',
        body: JSON.stringify({ name: inviteName, email: inviteEmail, phone: invitePhone }),
      })
      toast.success('Convite enviado com sucesso!')
      setIsInviteOpen(false)
      setInviteName('')
      setInviteEmail('')
      setInvitePhone('')
      loadData()
    } catch (err: any) {
      toast.error(err.response?.message || 'Erro ao enviar convite.')
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemoveEmployee = async (id: string) => {
    if (!confirm('Deseja realmente remover este funcionário? O acesso dele será revogado.')) return
    try {
      await pb.collection('users').update(id, { active: false })
      toast.success('Funcionário removido.')
      loadData()
    } catch (err) {
      toast.error('Erro ao remover funcionário.')
    }
  }

  const toggleAccess = async (moduleId: string, hasAccess: boolean) => {
    if (!manageUser) return
    try {
      if (hasAccess) {
        // Remove access
        const accessRecord = employeeAccess.find(
          (a) => a.employee_id === manageUser.id && a.module_id === moduleId,
        )
        if (accessRecord) {
          await pb.collection('employee_access').delete(accessRecord.id)
        }
      } else {
        // Grant access (default to 'user' role_company)
        await pb.collection('employee_access').create({
          employee_id: manageUser.id,
          module_id: moduleId,
          company_id: user?.company_id,
          role_company: 'user',
        })
      }
      loadData()
    } catch (err) {
      toast.error('Erro ao atualizar permissão.')
    }
  }

  const updateRoleCompany = async (accessId: string, roleCompany: string) => {
    try {
      await pb.collection('employee_access').update(accessId, { role_company: roleCompany })
      toast.success('Permissão atualizada.')
      loadData()
    } catch (err) {
      toast.error('Erro ao atualizar permissão.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipe</h1>
          <p className="text-muted-foreground">
            Gerencie o acesso dos seus funcionários aos módulos.
          </p>
        </div>
        <Button onClick={() => setIsInviteOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" /> Convidar Funcionário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Membros da Equipe</CardTitle>
          <CardDescription>
            Funcionários associados à sua empresa (Company ID:{' '}
            <Badge variant="secondary">{user?.company_id}</Badge>)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhum funcionário encontrado. Convide sua equipe para começar.
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell>{emp.email}</TableCell>
                    <TableCell>
                      <Badge variant={emp.active ? 'default' : 'secondary'}>
                        {emp.active ? 'Ativo' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setManageUser(emp)}
                          disabled={!emp.active}
                        >
                          <Shield className="h-4 w-4 mr-2" /> Permissões
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveEmployee(emp.id)}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <form onSubmit={handleInvite}>
            <DialogHeader>
              <DialogTitle>Convidar Funcionário</DialogTitle>
              <DialogDescription>
                O funcionário receberá um e-mail com instruções para ativar a conta e definir a
                senha.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone (Opcional)</Label>
                <Input value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isInviting}>
                {isInviting ? 'Enviando...' : 'Enviar Convite'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={!!manageUser} onOpenChange={(val) => !val && setManageUser(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Permissões de Acesso</DialogTitle>
            <DialogDescription>
              Conceda acesso a {manageUser?.name} para os módulos que você assina.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {subscriptions.length === 0 ? (
              <div className="text-center p-4 bg-muted/50 rounded-md">
                Você não possui assinaturas ativas no momento.
              </div>
            ) : (
              subscriptions.map((sub) => {
                const mod = modules.find((m) => m.id === sub.module_id)
                if (!mod) return null

                const hasAccess = employeeAccess.some(
                  (a) => a.employee_id === manageUser?.id && a.module_id === mod.id,
                )

                const accessRecord = employeeAccess.find(
                  (a) => a.employee_id === manageUser?.id && a.module_id === mod.id,
                )

                return (
                  <div key={sub.id} className="flex flex-col gap-3 p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{mod.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {mod.description || 'Acesso ao módulo'}
                        </p>
                      </div>
                      <Switch
                        checked={hasAccess}
                        onCheckedChange={() => toggleAccess(mod.id, hasAccess)}
                      />
                    </div>
                    {hasAccess && accessRecord && (
                      <div className="flex items-center justify-between pt-2 border-t">
                        <Label className="text-sm">Nível de Permissão</Label>
                        <select
                          className="flex h-9 w-[130px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          value={accessRecord.role_company || 'user'}
                          onChange={(e) => updateRoleCompany(accessRecord.id, e.target.value)}
                        >
                          <option value="user">Usuário</option>
                          <option value="admin">Administrador</option>
                        </select>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setManageUser(null)}>Concluído</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
