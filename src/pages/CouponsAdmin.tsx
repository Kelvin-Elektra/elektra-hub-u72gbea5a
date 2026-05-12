import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Ticket, Plus } from 'lucide-react'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'

export default function CouponsAdmin() {
  const [coupons, setCoupons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage',
    value: '',
    free_months: '',
    max_uses: '',
    active: true,
  })

  const fetchCoupons = async () => {
    try {
      setLoading(true)
      const data = await pb.collection('coupons').getFullList({ sort: '-created' })
      setCoupons(data)
    } catch (error) {
      console.error(error)
      toast.error('Erro ao carregar cupons.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCoupons()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const dataToSave = {
        code: formData.code.toUpperCase(),
        type: formData.type,
        active: formData.active,
        value: formData.value ? Number(formData.value) : 0,
        free_months: formData.free_months ? Number(formData.free_months) : 0,
        max_uses: formData.max_uses ? Number(formData.max_uses) : 0,
        current_uses: 0,
      }

      await pb.collection('coupons').create(dataToSave)
      toast.success('Cupom criado com sucesso!')
      setIsDialogOpen(false)
      fetchCoupons()
      setFormData({
        code: '',
        type: 'percentage',
        value: '',
        free_months: '',
        max_uses: '',
        active: true,
      })
    } catch (error: any) {
      toast.error(error.response?.message || 'Erro ao criar cupom')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await pb.collection('coupons').update(id, { active: !currentStatus })
      toast.success('Status atualizado')
      fetchCoupons()
    } catch (error) {
      toast.error('Erro ao atualizar status')
    }
  }

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      percentage: 'Porcentagem (%)',
      fixed_amount: 'Valor Fixo (R$)',
      free_months: 'Meses Gratuitos',
    }
    return types[type] || type
  }

  const getValueDisplay = (coupon: any) => {
    if (coupon.type === 'percentage') return `${coupon.value}%`
    if (coupon.type === 'fixed_amount') return `R$ ${coupon.value.toFixed(2).replace('.', ',')}`
    if (coupon.type === 'free_months') return `${coupon.free_months} Mês(es)`
    return '-'
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cupons de Desconto</h1>
          <p className="text-muted-foreground">
            Gerencie promoções e descontos para assinaturas de módulos.
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Cupom
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" /> Lista de Cupons
          </CardTitle>
          <CardDescription>Visualização de todos os cupons registrados no sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Benefício</TableHead>
                <TableHead>Usos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : coupons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum cupom encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                coupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell className="font-bold">{coupon.code}</TableCell>
                    <TableCell>{getTypeLabel(coupon.type)}</TableCell>
                    <TableCell>{getValueDisplay(coupon)}</TableCell>
                    <TableCell>
                      {coupon.current_uses} / {coupon.max_uses > 0 ? coupon.max_uses : '∞'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={coupon.active ? 'default' : 'secondary'}>
                        {coupon.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(coupon.id, coupon.active)}
                      >
                        {coupon.active ? 'Desativar' : 'Ativar'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>Novo Cupom</DialogTitle>
              <DialogDescription>Crie um novo cupom de desconto.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Código do Cupom</Label>
                <Input
                  required
                  placeholder="EX: BLACKFRIDAY"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Desconto</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(val) => setFormData({ ...formData, type: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                      <SelectItem value="fixed_amount">Valor Fixo (R$)</SelectItem>
                      <SelectItem value="free_months">Meses Gratuitos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.type === 'free_months' ? (
                  <div className="space-y-2">
                    <Label>Qtd. de Meses</Label>
                    <Input
                      type="number"
                      required
                      min="1"
                      placeholder="Ex: 2"
                      value={formData.free_months}
                      onChange={(e) => setFormData({ ...formData, free_months: e.target.value })}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Valor</Label>
                    <Input
                      type="number"
                      required
                      step="0.01"
                      min="0.01"
                      placeholder={formData.type === 'percentage' ? 'Ex: 10' : 'Ex: 50.00'}
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Limite de Usos (0 para ilimitado)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(val) => setFormData({ ...formData, active: val })}
                />
                <Label htmlFor="active">Cupom Ativo Imediatamente</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
