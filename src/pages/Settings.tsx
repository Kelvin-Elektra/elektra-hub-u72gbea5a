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
import { Plus, Edit2, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  getModules,
  createModule,
  updateModule,
  getSettings,
  updateSettings,
  type Module,
  type Settings as SettingsType,
} from '@/services/api'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'

export default function Settings() {
  const [modules, setModules] = useState<Module[]>([])
  const [settings, setSettingsState] = useState<SettingsType | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<Module>>({ status: 'active', base_price: 0 })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const loadData = async () => {
    try {
      const [modData, setObj] = await Promise.all([getModules(), getSettings()])
      setModules(modData)
      setSettingsState(setObj)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('modules', loadData)
  useRealtime('settings', loadData)

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

  const handleLogoUpload = async () => {
    if (!logoFile) return
    setIsUploading(true)
    try {
      const data = new FormData()
      data.append('logo', logoFile)
      if (settings?.id) {
        await updateSettings(settings.id, data)
        toast.success('Logo atualizada com sucesso.')
        setLogoFile(null)
        loadData()
      }
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Módulos & Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie a identidade visual e o catálogo de softwares.
          </p>
        </div>
      </div>

      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            <CardTitle>Identidade Visual</CardTitle>
          </div>
          <CardDescription>
            Logo do sistema (exibida no painel Admin e portal do Cliente).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="h-20 w-40 bg-muted/50 rounded-lg flex items-center justify-center border border-border overflow-hidden p-2 shrink-0">
            {settings?.logo ? (
              <img
                src={pb.files.getURL(settings, settings.logo)}
                alt="Logo"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <span className="text-xs text-muted-foreground font-medium">Sem logo</span>
            )}
          </div>
          <div className="flex-1 flex flex-col gap-3">
            <Label>Fazer upload de nova logo</Label>
            <div className="flex items-center gap-3">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                className="max-w-sm cursor-pointer file:text-primary file:font-medium"
              />
              <Button onClick={handleLogoUpload} disabled={!logoFile || isUploading}>
                {isUploading ? 'Salvando...' : 'Salvar Logo'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Recomendado: PNG ou SVG com fundo transparente.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="space-y-1">
            <CardTitle className="text-xl">Catálogo de Módulos</CardTitle>
            <CardDescription>Sistemas disponíveis para assinatura no Hub.</CardDescription>
          </div>
          <Button onClick={() => handleOpen()} className="gap-2">
            <Plus className="h-4 w-4" /> Adicionar Módulo
          </Button>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50 border-border">
              <TableHead>Nome</TableHead>
              <TableHead>Link de Acesso</TableHead>
              <TableHead>Endpoint Sync</TableHead>
              <TableHead>Preço Base</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.length > 0 ? (
              modules.map((mod) => (
                <TableRow key={mod.id} className="border-border hover:bg-muted/30">
                  <TableCell className="font-medium">{mod.name}</TableCell>
                  <TableCell
                    className="text-sm text-muted-foreground truncate max-w-[150px]"
                    title={mod.access_url}
                  >
                    {mod.access_url || '-'}
                  </TableCell>
                  <TableCell
                    className="text-sm text-muted-foreground truncate max-w-[150px]"
                    title={mod.endpoint_url}
                  >
                    {mod.endpoint_url || '-'}
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
              <Label>Link de Acesso (Client Portal)</Label>
              <Input
                value={formData.access_url || ''}
                onChange={(e) => setFormData({ ...formData, access_url: e.target.value })}
                placeholder="https://app.exemplo.com"
                type="url"
              />
            </div>
            <div className="space-y-2">
              <Label>Endpoint de Sincronização (Webhook API)</Label>
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
