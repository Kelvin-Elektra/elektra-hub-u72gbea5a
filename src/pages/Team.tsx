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
import { UserPlus, Shield, Trash2, Copy, Check, Key } from 'lucide-react'
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
  const [invitePassword, setInvitePassword] = useState('')
  const [invitePhone, setInvitePhone] = useState('')
  const [isInviting, setIsInviting] = useState(false)

  // Armazenamento em memória das senhas cadastradas recentemente para cópia facilitada
  const [savedPasswords, setSavedPasswords] = useState<Record<string, string>>(() => {
    try {
      const stored = sessionStorage.getItem('elektra_team_passwords')
      return stored ? JSON.parse(stored) : {}
    } catch (_) {
      return {}
    }
  })
  const [copiedId, setCopiedId] = useState<string | null>(null)

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
    const cleanEmail = inviteEmail.trim().toLowerCase()

    if (invitePassword && invitePassword.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres.')
      setIsInviting(false)
      return
    }

    try {
      // Pré-verificação no client para feedback imediato
      const existing = await pb.collection('users').getList(1, 1, {
        filter: `email = "${cleanEmail}"`,
      })
      if (existing.items.length > 0) {
        toast.error('Este e-mail já está cadastrado no HUB.')
        setIsInviting(false)
        return
      }

      const res = await pb.send('/backend/v1/invite-employee', {
        method: 'POST',
        body: JSON.stringify({
          name: inviteName.trim(),
          email: cleanEmail,
          password: invitePassword.trim(),
          phone: invitePhone,
        }),
      })

      // Salva a senha temporariamente em cache para o botão "copiar credenciais"
      if (res.password && cleanEmail) {
        const updated = { ...savedPasswords, [cleanEmail]: res.password }
        setSavedPasswords(updated)
        try {
          sessionStorage.setItem('elektra_team_passwords', JSON.stringify(updated))
        } catch {
          /* intentionally ignored */
        }
      }

      toast.success('Colaborador adicionado com sucesso!')
      setIsInviteOpen(false)
      setInviteName('')
      setInviteEmail('')
      setInvitePassword('')
      setInvitePhone('')
      loadData()
    } catch (err: any) {
      const msg = err.response?.message || err.message || 'Erro ao adicionar colaborador.'
      if (msg.includes('cadastrado') || msg.includes('unique')) {
        toast.error('Este e-mail já está cadastrado no HUB.')
      } else {
        toast.error(msg)
      }
    } finally {
      setIsInviting(false)
    }
  }

  const handleCopyCredentials = (emp: any) => {
    const hubUrl = window.location.origin.includes('localhost')
      ? 'https://hub.elektrasolucoes.tech'
      : window.location.origin
    const empEmail = emp.email || emp.username || ''
    const password =
      savedPasswords[empEmail?.toLowerCase()] || '[Senha cadastrada pelo administrador]'

    const text = `Credenciais de Acesso - Elektra HUB:\n\nNome: ${emp.name}\nE-mail: ${empEmail}\nSenha: ${password}\n\nLink de Acesso: ${hubUrl}`

    navigator.clipboard.writeText(text)
    setCopiedId(emp.id)
    toast.success('Credenciais copiadas para a área de transferência!')
    setTimeout(() => setCopiedId(null), 2500)
  }

  const handleRemoveEmployee = async (id: string) => {
    if (!confirm('Deseja realmente remover este colaborador? O acesso dele será revogado.')) return
    try {
      await pb.collection('users').update(id, { active: false })
      toast.success('Colaborador removido com sucesso.')
      loadData()
    } catch (err: any) {
      const status = err?.status || err?.response?.status
      if (status === 404) {
        toast.error('Colaborador não encontrado ou você não tem permissão para inativá-lo.')
      } else {
        toast.error(err?.message || 'Erro ao remover colaborador.')
      }
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
        // Checar limite de colaboradores do módulo nesta assinatura
        const sub = subscriptions.find((s) => s.module_id === moduleId)
        const currentCount = employeeAccess.filter((a) => a.module_id === moduleId).length
        const maxLimit = sub?.max_users || 1
        if (currentCount >= maxLimit) {
          toast.error(
            `Limite da faixa atingido (${currentCount}/${maxLimit} colaboradores). Faça upgrade da faixa para associar mais colaboradores.`,
          )
          return
        }

        // Grant access (default to 'user' role_company)
        await pb.collection('employee_access').create({
          employee_id: manageUser.id,
          module_id: moduleId,
          company_id: user?.company_id,
          role_company: 'user',
        })
      }
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar permissão.')
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
            Gerencie o acesso dos seus colaboradores aos módulos.
          </p>
        </div>
        <Button onClick={() => setIsInviteOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" /> Novo Colaborador
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Colaboradores da Equipe</CardTitle>
          <CardDescription>
            Colaboradores vinculados à sua empresa (Company ID:{' '}
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
                    Nenhum colaborador encontrado. Adicione membros à sua equipe.
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell>
                      <span className="font-medium text-foreground">
                        {emp.email || emp.username || 'Sem e-mail'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={emp.active ? 'default' : 'secondary'}>
                        {emp.active ? 'Ativo' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyCredentials(emp)}
                          className="gap-1.5 text-xs h-8"
                          title="Copiar credenciais de acesso e link do HUB para o colaborador"
                        >
                          {copiedId === emp.id ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-green-600" />
                              <span className="text-green-600">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>Copiar Credenciais</span>
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setManageUser(emp)}
                          disabled={!emp.active}
                          className="h-8 text-xs"
                        >
                          <Shield className="h-3.5 w-3.5 mr-1.5" /> Permissões
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveEmployee(emp.id)}
                          className="text-destructive hover:bg-destructive/10 h-8 w-8"
                          title="Remover colaborador"
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
              <DialogTitle>Adicionar Colaborador</DialogTitle>
              <DialogDescription>
                O colaborador terá acesso imediato sem necessidade de confirmação por e-mail.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  required
                  placeholder="Nome do colaborador"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail *</Label>
                <Input
                  type="email"
                  required
                  placeholder="colaborador@empresa.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Senha de Acesso *</Label>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Key className="h-3 w-3" /> Mín. 8 caracteres
                  </span>
                </div>
                <Input
                  type="password"
                  required
                  placeholder="Defina a senha inicial do colaborador"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone (Opcional)</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isInviting}>
                {isInviting ? 'Salvando...' : 'Adicionar Colaborador'}
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
