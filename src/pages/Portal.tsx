import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { getModules, getUserSubscriptions, type Module, type Subscription } from '@/services/api'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'
import { Plug, CreditCard, Receipt, QrCode, ShoppingCart, Trash2, ExternalLink } from 'lucide-react'

export default function Portal() {
  const { user } = useAuth()
  const [modules, setModules] = useState<Module[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])

  const [cart, setCart] = useState<Module[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  const [paymentMethod, setPaymentMethod] = useState<'CREDIT_CARD' | 'PIX' | 'BOLETO'>(
    'CREDIT_CARD',
  )
  const [ccNumber, setCcNumber] = useState('')
  const [ccName, setCcName] = useState('')
  const [ccExpiry, setCcExpiry] = useState('')
  const [ccCvv, setCcCvv] = useState('')
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    if (!user) return
    try {
      const [mods, subs] = await Promise.all([getModules(), getUserSubscriptions(user.id)])
      setModules(mods.filter((m) => m.status === 'active'))
      setSubscriptions(subs)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])
  useRealtime('subscriptions', loadData)
  useRealtime('modules', loadData)

  const addToCart = (mod: Module) => {
    if (!cart.find((m) => m.id === mod.id)) {
      setCart([...cart, mod])
      toast.success(`${mod.name} adicionado ao carrinho`)
    }
  }

  const removeFromCart = (modId: string) => {
    setCart(cart.filter((m) => m.id !== modId))
  }

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cart.length === 0) return
    setLoading(true)

    try {
      let expiryMonth = ''
      let expiryYear = ''
      if (paymentMethod === 'CREDIT_CARD') {
        const parts = ccExpiry.split('/')
        if (parts.length !== 2) throw new Error('Data de validade inválida. Use MM/AAAA')
        expiryMonth = parts[0].trim()
        expiryYear = parts[1].trim()
        if (expiryYear.length === 2) expiryYear = '20' + expiryYear
      }

      for (const item of cart) {
        await pb.send('/backend/v1/checkout', {
          method: 'POST',
          body: JSON.stringify({
            moduleId: item.id,
            paymentMethod,
            creditCardNumber: ccNumber.replace(/\D/g, ''),
            creditCardHolderName: ccName,
            creditCardExpiryMonth: expiryMonth,
            creditCardExpiryYear: expiryYear,
            creditCardCcv: ccCvv,
          }),
          headers: { 'Content-Type': 'application/json' },
        })
      }

      toast.success('Assinatura(s) processada(s) com sucesso!')
      setIsCheckoutOpen(false)
      setCart([])
      loadData()
    } catch (error: any) {
      toast.error(error.response?.message || error.message || 'Erro ao processar assinatura.')
    } finally {
      setLoading(false)
    }
  }

  const handleAccess = async (mod: Module) => {
    try {
      const res = await pb.send('/backend/v1/sso-token', { method: 'POST' })
      const url = new URL(mod.access_url || 'https://example.com')
      url.searchParams.set('sso_token', res.token)
      window.open(url.toString(), '_blank')
    } catch (err) {
      toast.error('Erro ao gerar token de acesso.')
    }
  }

  return (
    <div className="space-y-6 relative pb-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Módulos Disponíveis</h1>
        <p className="text-muted-foreground">
          Explore e ative novas funcionalidades para sua conta.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((mod) => {
          const sub = subscriptions.find((s) => s.module_id === mod.id)
          const isActive = sub?.status === 'active'
          const inCart = cart.some((m) => m.id === mod.id)

          return (
            <Card key={mod.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Plug className="h-5 w-5 text-primary" />
                  </div>
                  {isActive ? (
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-600 border-emerald-200"
                    >
                      Ativo
                    </Badge>
                  ) : sub ? (
                    <Badge
                      variant="outline"
                      className="bg-amber-500/10 text-amber-600 border-amber-200"
                    >
                      {sub.status === 'trialing' ? 'Processando' : sub.status}
                    </Badge>
                  ) : null}
                </div>
                <CardTitle className="mt-4">{mod.name}</CardTitle>
                <CardDescription>
                  R$ {mod.base_price.toFixed(2).replace('.', ',')} / mês
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                {mod.logo && (
                  <div className="flex justify-center mb-4">
                    <img
                      src={pb.files.getURL(mod as any, mod.logo)}
                      alt={`Logo ${mod.name}`}
                      className="h-16 object-contain"
                    />
                  </div>
                )}
                {mod.description ? (
                  <p className="text-sm text-muted-foreground">{mod.description}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Ative este módulo para acessar funcionalidades exclusivas do {mod.name}.
                  </p>
                )}
                {mod.features && (
                  <div className="space-y-1 mt-4">
                    <p className="text-xs font-semibold text-foreground">Recursos:</p>
                    <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                      {mod.features.split('\n').map((feat: string, i: number) => (
                        <li key={i}>{feat}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                {isActive ? (
                  <Button variant="outline" className="w-full" onClick={() => handleAccess(mod)}>
                    Acessar Módulo <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={inCart ? 'secondary' : 'default'}
                    onClick={() => (inCart ? removeFromCart(mod.id) : addToCart(mod))}
                    disabled={!!sub && sub.status !== 'canceled'}
                  >
                    {sub && sub.status !== 'canceled'
                      ? 'Processando...'
                      : inCart
                        ? 'Remover do Carrinho'
                        : 'Adicionar ao Carrinho'}
                  </Button>
                )}
              </CardFooter>
            </Card>
          )
        })}
      </div>

      <div className="fixed bottom-8 right-8 z-40">
        <Button
          className="rounded-full shadow-elevation h-16 w-16 relative"
          onClick={() => setIsCartOpen(true)}
        >
          <ShoppingCart className="h-6 w-6" />
          {cart.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-in zoom-in">
              {cart.length}
            </span>
          )}
        </Button>
      </div>

      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent className="flex flex-col">
          <SheetHeader>
            <SheetTitle>Seu Carrinho</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-6 space-y-4">
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between items-center border-b pb-4">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    R$ {item.base_price.toFixed(2).replace('.', ',')} / mês
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="text-center text-muted-foreground pt-12 flex flex-col items-center">
                <ShoppingCart className="h-12 w-12 mb-4 opacity-20" />
                <p>Seu carrinho está vazio.</p>
              </div>
            )}
          </div>
          {cart.length > 0 && (
            <div className="border-t pt-6 mt-auto">
              <div className="flex justify-between font-bold text-lg mb-6">
                <span>Total:</span>
                <span>
                  R${' '}
                  {cart
                    .reduce((acc, item) => acc + item.base_price, 0)
                    .toFixed(2)
                    .replace('.', ',')}
                </span>
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={() => {
                  setIsCartOpen(false)
                  setIsCheckoutOpen(true)
                }}
              >
                Finalizar Compra
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleCheckout}>
            <DialogHeader>
              <DialogTitle>Finalizar Assinatura</DialogTitle>
              <DialogDescription>
                Você está assinando {cart.length} módulo(s) por R${' '}
                {cart
                  .reduce((acc, item) => acc + item.base_price, 0)
                  .toFixed(2)
                  .replace('.', ',')}{' '}
                / mês
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-3">
                <Label>Forma de Pagamento</Label>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(val: any) => setPaymentMethod(val)}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="CREDIT_CARD" id="cc" />
                    <Label htmlFor="cc" className="flex items-center cursor-pointer gap-2">
                      <CreditCard className="h-4 w-4" /> Cartão
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="PIX" id="pix" />
                    <Label htmlFor="pix" className="flex items-center cursor-pointer gap-2">
                      <QrCode className="h-4 w-4" /> PIX
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="BOLETO" id="boleto" />
                    <Label htmlFor="boleto" className="flex items-center cursor-pointer gap-2">
                      <Receipt className="h-4 w-4" /> Boleto
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {paymentMethod === 'CREDIT_CARD' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                  <div className="space-y-2">
                    <Label>Número do Cartão</Label>
                    <Input
                      placeholder="0000 0000 0000 0000"
                      value={ccNumber}
                      onChange={(e) => setCcNumber(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nome Impresso no Cartão</Label>
                    <Input
                      placeholder="JOAO DA SILVA"
                      value={ccName}
                      onChange={(e) => setCcName(e.target.value.toUpperCase())}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Validade</Label>
                      <Input
                        placeholder="MM/AAAA"
                        value={ccExpiry}
                        onChange={(e) => setCcExpiry(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>CVV</Label>
                      <Input
                        placeholder="123"
                        maxLength={4}
                        value={ccCvv}
                        onChange={(e) => setCcCvv(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCheckoutOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Processando...' : 'Confirmar Assinatura'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
