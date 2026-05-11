import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
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
import { toast } from 'sonner'

export default function MyData() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    tax_id: '',
    postal_code: '',
    address: '',
    address_number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  })

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        company_name: user.company_name || '',
        tax_id: user.tax_id || '',
        postal_code: user.postal_code || '',
        address: user.address || '',
        address_number: user.address_number || '',
        complement: user.complement || '',
        neighborhood: user.neighborhood || '',
        city: user.city || '',
        state: user.state || '',
      })
    }
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.id]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    try {
      await pb.collection('users').update(user.id, formData)
      toast.success('Dados atualizados com sucesso!')
    } catch (error) {
      toast.error('Erro ao atualizar os dados.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meus Dados</h1>
        <p className="text-muted-foreground">Gerencie suas informações de perfil e endereço.</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Informações Pessoais / Empresa</CardTitle>
            <CardDescription>Estes dados são usados para faturamento e contato.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input id="name" value={formData.name} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_name">Nome da Empresa</Label>
                <Input id="company_name" value={formData.company_name} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax_id">Documento (CPF/CNPJ)</Label>
                <Input id="tax_id" value={formData.tax_id} onChange={handleChange} required />
              </div>
            </div>

            <h3 className="text-sm font-medium pt-4 border-t">Endereço</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postal_code">CEP</Label>
                <Input id="postal_code" value={formData.postal_code} onChange={handleChange} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Logradouro</Label>
                <Input id="address" value={formData.address} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_number">Número</Label>
                <Input
                  id="address_number"
                  value={formData.address_number}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="complement">Complemento</Label>
                <Input id="complement" value={formData.complement} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input id="neighborhood" value={formData.neighborhood} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" value={formData.city} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado (UF)</Label>
                <Input id="state" value={formData.state} onChange={handleChange} maxLength={2} />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t pt-6">
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
