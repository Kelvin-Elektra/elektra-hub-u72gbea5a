import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import pb from '@/lib/pocketbase/client'
import { toast } from 'sonner'
import { ArrowLeft, Save } from 'lucide-react'

export default function SubscriptionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [sub, setSub] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [status, setStatus] = useState('')
  const [maxUsers, setMaxUsers] = useState(1)

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!id) return
        const record = await pb.collection('subscriptions').getOne(id, {
          expand: 'user_id,module_id',
        })
        setSub(record)
        setStatus(record.status)
        setMaxUsers(record.max_users || 1)
      } catch (err) {
        toast.error('Erro ao carregar assinatura')
        navigate('/admin/assinaturas')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id, navigate])

  const handleSave = async () => {
    try {
      setSaving(true)
      if (!id) return
      await pb.collection('subscriptions').update(id, {
        status,
        max_users: maxUsers,
      })
      toast.success('Assinatura atualizada com sucesso!')
    } catch (err) {
      toast.error('Erro ao atualizar assinatura')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !sub) {
    return <div className="p-8 text-center text-muted-foreground">Carregando...</div>
  }

  const user = sub.expand?.user_id
  const module = sub.expand?.module_id

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/admin/assinaturas')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Detalhes da Assinatura</h1>
          <p className="text-muted-foreground">ID: {sub.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações do Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Nome</Label>
              <div className="font-medium">{user?.name || 'N/A'}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">E-mail</Label>
              <div className="font-medium">{user?.email || 'N/A'}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Empresa</Label>
              <div className="font-medium">{user?.company_name || 'N/A'}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Documento (CPF/CNPJ)</Label>
              <div className="font-medium">{user?.tax_id || 'N/A'}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalhes do Módulo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Módulo</Label>
              <div className="font-medium">{module?.name || 'N/A'}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Módulo ID</Label>
              <div className="font-medium font-mono text-sm">{module?.id || 'N/A'}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">URL de Acesso</Label>
              <div className="font-medium text-primary">
                {module?.access_url ? (
                  <a
                    href={module.access_url}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    {module.access_url}
                  </a>
                ) : (
                  'N/A'
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Configurações da Assinatura</CardTitle>
            <CardDescription>Altere limites e status manualmente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
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
                <Label>Limite de Usuários (CRM)</Label>
                <Input
                  type="number"
                  min={1}
                  value={maxUsers}
                  onChange={(e) => setMaxUsers(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label>Preço</Label>
                <Input value={`R$ ${sub.price?.toFixed(2).replace('.', ',') || '0,00'}`} disabled />
              </div>
              <div className="space-y-2">
                <Label>ID Asaas Assinatura</Label>
                <Input value={sub.asaas_subscription_id || 'N/A'} disabled />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t pt-4 mt-2">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
