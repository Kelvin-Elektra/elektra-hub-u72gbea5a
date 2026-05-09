import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
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
import { Plus, Edit2, Server } from 'lucide-react'
import { toast } from 'sonner'
import { getModules, createModule, updateModule, type Module } from '@/services/api'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { useRealtime } from '@/hooks/use-realtime'

export default function Settings() {
  const [modules, setModules] = useState<Module[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<Module>>({ status: 'active', base_price: 0 })

  const loadData = async () => {
    try {
      const data = await getModules()
      setModules(data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('modules', loadData)

  const handleOpen = (mod?: Module) => {
    if (mod) {
      setEditingId(mod.id)
      setFormData(mod)
    } else {
      setEditingId(null)
      setFormData({ status: 'active', base_price: 0 })
    }
    setIsOpen(true)
  }

  const handleSave = async () => {
    try {
      if (editingId) {
        await updateModule(editingId, formData)
        toast.success('Módulo atualizado com sucesso.')
      } else {
        await createModule(formData)
        toast.success('Módulo criado com sucesso.')
      }
      setIsOpen(false)
      loadData()
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Módulos & Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie o catálogo de softwares, integrações e preços base.
          </p>
        </div>
        <Button onClick={() => handleOpen()} className="gap-2">
          <Plus className="h-4 w-4" /> Adicionar Módulo
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="space-y-1">
            <CardTitle className="text-xl">Catálogo de Módulos</CardTitle>
            <CardDescription>Sistemas disponíveis para assinatura no Hub.</CardDescription>
          </div>
          <Server className="h-6 w-6 text-muted-foreground" />
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nome</TableHead>
              <TableHead>Endpoint de Sync</TableHead>
              <TableHead>Secret Key</TableHead>
              <TableHead>Preço Base</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.length > 0 ? (
              modules.map((mod) => (
                <TableRow key={mod.id}>
                  <TableCell className="font-medium">{mod.name}</TableCell>
                  <TableCell
                    className="text-sm text-muted-foreground truncate max-w-[200px]"
                    title={mod.endpoint_url}
                  >
                    {mod.endpoint_url || '-'}
                  </TableCell>
                  <TableCell className="text-sm font-mono bg-muted/30 px-2 rounded w-max">
                    {mod.secret_key_name || '-'}
                  </TableCell>
                  <TableCell>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      mod.base_price,
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        mod.status === 'active'
                          ? 'default'
                          : mod.status === 'maintenance'
                            ? 'secondary'
                            : 'destructive'
                      }
                    >
                      {mod.status === 'active'
                        ? 'Ativo'
                        : mod.status === 'maintenance'
                          ? 'Manutenção'
                          : 'Descontinuado'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpen(mod)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Nenhum módulo configurado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Módulo' : 'Novo Módulo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Módulo</Label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ex: Elektra CRM"
              />
            </div>
            <div className="space-y-2">
              <Label>Endpoint de Sincronização (Webhook)</Label>
              <Input
                value={formData.endpoint_url || ''}
                onChange={(e) => setFormData({ ...formData, endpoint_url: e.target.value })}
                placeholder="https://api.exemplo.com/hub-sync"
                type="url"
              />
            </div>
            <div className="space-y-2">
              <Label>Nome da Chave Secreta (Vault)</Label>
              <Input
                value={formData.secret_key_name || ''}
                onChange={(e) => setFormData({ ...formData, secret_key_name: e.target.value })}
                placeholder="ex: ELEKTRA_CRM"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço Base (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.base_price || 0}
                  onChange={(e) =>
                    setFormData({ ...formData, base_price: parseFloat(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val: any) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="maintenance">Manutenção</SelectItem>
                    <SelectItem value="deprecated">Descontinuado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
