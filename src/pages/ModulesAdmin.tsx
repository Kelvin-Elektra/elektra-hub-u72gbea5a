import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import pb from '@/lib/pocketbase/client'
import { toast } from 'sonner'
import { Plus, Edit, Trash2 } from 'lucide-react'

export default function ModulesAdmin() {
  const [modules, setModules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [isOpen, setIsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentId, setCurrentId] = useState('')

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [features, setFeatures] = useState('')
  const [basePrice, setBasePrice] = useState(0)
  const [status, setStatus] = useState('active')
  const [accessUrl, setAccessUrl] = useState('')
  const [endpointUrl, setEndpointUrl] = useState('')
  const [secretKeyName, setSecretKeyName] = useState('')

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadModules = async () => {
    try {
      setLoading(true)
      const records = await pb.collection('modules').getFullList({ sort: 'name' })
      setModules(records)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadModules()
  }, [])

  const handleOpenNew = () => {
    setIsEditing(false)
    setCurrentId('')
    setName('')
    setDescription('')
    setFeatures('')
    setBasePrice(0)
    setStatus('active')
    setAccessUrl('')
    setEndpointUrl('')
    setSecretKeyName('')
    setLogoFile(null)
    setIsOpen(true)
  }

  const handleOpenEdit = (mod: any) => {
    setIsEditing(true)
    setCurrentId(mod.id)
    setName(mod.name)
    setDescription(mod.description || '')
    setFeatures(mod.features || '')
    setBasePrice(mod.base_price || 0)
    setStatus(mod.status)
    setAccessUrl(mod.access_url || '')
    setEndpointUrl(mod.endpoint_url || '')
    setSecretKeyName(mod.secret_key_name || '')
    setLogoFile(null)
    setIsOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este módulo?')) return
    try {
      await pb.collection('modules').delete(id)
      toast.success('Módulo excluído')
      loadModules()
    } catch (err) {
      toast.error('Erro ao excluir')
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('description', description)
      formData.append('features', features)
      formData.append('base_price', basePrice.toString())
      formData.append('status', status)
      formData.append('access_url', accessUrl)
      formData.append('endpoint_url', endpointUrl)
      formData.append('secret_key_name', secretKeyName)

      if (logoFile) {
        formData.append('logo', logoFile)
      }

      if (isEditing) {
        await pb.collection('modules').update(currentId, formData)
        toast.success('Módulo atualizado')
      } else {
        await pb.collection('modules').create(formData)
        toast.success('Módulo criado')
      }
      setIsOpen(false)
      loadModules()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar módulo')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Módulos</h1>
          <p className="text-muted-foreground">Gerencie os módulos do ecossistema.</p>
        </div>
        <Button onClick={handleOpenNew}>
          <Plus className="h-4 w-4 mr-2" /> Novo Módulo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : modules.length === 0 ? (
          <p className="text-muted-foreground">Nenhum módulo encontrado.</p>
        ) : (
          modules.map((mod) => (
            <Card key={mod.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  {mod.logo ? (
                    <img
                      src={pb.files.getURL(mod, mod.logo)}
                      alt="Logo"
                      className="h-10 object-contain"
                    />
                  ) : (
                    <div className="h-10 w-10 bg-primary/10 rounded flex items-center justify-center font-bold text-primary">
                      {mod.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(mod)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(mod.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="mt-2">{mod.name}</CardTitle>
                <CardDescription>R$ {mod.base_price.toFixed(2)} / mês</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {mod.description || 'Sem descrição'}
                </p>
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <span className="font-semibold">Status:</span>
                  <span className={mod.status === 'active' ? 'text-emerald-600' : 'text-amber-600'}>
                    {mod.status}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Editar Módulo' : 'Novo Módulo'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Preço Base (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={basePrice}
                    onChange={(e) => setBasePrice(parseFloat(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição Curta</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Aparece no card do cliente"
                />
              </div>

              <div className="space-y-2">
                <Label>Features (uma por linha)</Label>
                <Textarea
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
                  placeholder="Recurso 1&#10;Recurso 2"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
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
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>URL de Acesso (Client App)</Label>
                <Input
                  type="url"
                  value={accessUrl}
                  onChange={(e) => setAccessUrl(e.target.value)}
                  placeholder="https://crm.exemplo.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Webhook Endpoint</Label>
                  <Input
                    type="url"
                    value={endpointUrl}
                    onChange={(e) => setEndpointUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome da Chave Secreta (Env)</Label>
                  <Input
                    value={secretKeyName}
                    onChange={(e) => setSecretKeyName(e.target.value)}
                    placeholder="ELEKTRA_CRM_SECRET"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
