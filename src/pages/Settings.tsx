import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { Settings2, Plus, Key } from 'lucide-react'
import { getModules, createModule, updateModule, type Module } from '@/services/api'
import { getErrorMessage } from '@/lib/pocketbase/errors'
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

export default function Settings() {
  const [modules, setModules] = useState<Module[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [editingModule, setEditingModule] = useState<Module | null>(null)
  const [formData, setFormData] = useState<Partial<Module>>({ status: 'active' })

  const loadModules = async () => {
    try {
      const data = await getModules()
      setModules(data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadModules()
  }, [])

  const handleOpen = (mod?: Module) => {
    if (mod) {
      setEditingModule(mod)
      setFormData(mod)
    } else {
      setEditingModule(null)
      setFormData({ status: 'active', base_price: 0 })
    }
    setIsOpen(true)
  }

  const handleSave = async () => {
    try {
      if (editingModule) {
        await updateModule(editingModule.id, formData)
        toast.success('Módulo atualizado.')
      } else {
        await createModule(formData)
        toast.success('Módulo criado.')
      }
      setIsOpen(false)
      loadModules()
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Módulos & Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie os módulos externos e suas integrações via Webhook.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" /> Módulos Conectados
            </CardTitle>
            <CardDescription>Sistemas que compõem o ecossistema Hub.</CardDescription>
          </div>
          <Button onClick={() => handleOpen()} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Módulo
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Módulo</TableHead>
                <TableHead>Endpoint Webhook</TableHead>
                <TableHead>Preço Base</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modules.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell
                    className="text-xs text-muted-foreground max-w-[250px] truncate"
                    title={m.endpoint_url}
                  >
                    {m.endpoint_url || '-'}
                  </TableCell>
                  <TableCell>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      m.base_price,
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.status === 'active' ? 'default' : 'secondary'}>
                      {m.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleOpen(m)}>
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {modules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    Nenhum módulo encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" /> Integração de Pagamento (Asaas)
          </CardTitle>
          <CardDescription>Configure os tokens para automação financeira.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Token de Acesso (API Asaas)</Label>
            <Input type="password" value="sk_live_dummy_placeholder" readOnly />
            <p className="text-xs text-muted-foreground">
              Gerenciado pelas configurações de ambiente do servidor Skip Cloud.
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingModule ? 'Editar Módulo' : 'Novo Módulo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Módulo</Label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Endpoint de Sincronização (Webhook URL)</Label>
              <Input
                placeholder="https://api..."
                value={formData.endpoint_url || ''}
                onChange={(e) => setFormData({ ...formData, endpoint_url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Nome da Chave Secreta (Skip Cloud Secrets)</Label>
              <Input
                placeholder="ELEKTRA_CRM"
                value={formData.secret_key_name || ''}
                onChange={(e) => setFormData({ ...formData, secret_key_name: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                A chave que será enviada no header X-Hub-Secret.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Preço Base (R$)</Label>
              <Input
                type="number"
                value={formData.base_price || 0}
                onChange={(e) => setFormData({ ...formData, base_price: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(val: any) => setFormData({ ...formData, status: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="maintenance">Em Manutenção</SelectItem>
                  <SelectItem value="deprecated">Obsoleto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
