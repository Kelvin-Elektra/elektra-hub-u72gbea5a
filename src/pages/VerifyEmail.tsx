import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { toast } from 'sonner'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'idle'>('idle')
  const [isEmployee, setIsEmployee] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      return
    }

    try {
      // Decode JWT payload to check is_owner
      const payloadBase64 = token.split('.')[1]
      const payloadStr = atob(payloadBase64)
      const payload = JSON.parse(payloadStr)
      if (payload.is_owner === false) {
        setIsEmployee(true)
      } else {
        // If owner, we can verify immediately without prompting for password again
        handleVerify()
      }
    } catch (e) {
      // Fallback
      handleVerify()
    }
  }, [token])

  const handleVerify = async () => {
    if (!token) return

    if (isEmployee && password.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres.')
      return
    }
    if (isEmployee && password !== confirmPassword) {
      toast.error('As senhas não coincidem.')
      return
    }

    setStatus('loading')
    try {
      await pb.send('/backend/v1/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token, password: isEmployee ? password : undefined }),
      })
      setStatus('success')
      toast.success('Conta ativada com sucesso!')
      setTimeout(() => navigate('/login'), 3000)
    } catch (error: any) {
      setStatus('error')
      toast.error(error.response?.message || 'Erro ao verificar e-mail.')
    }
  }

  if (status === 'idle') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md shadow-elevation">
          <CardHeader className="text-center">
            <CardTitle>Ativar Conta</CardTitle>
            <CardDescription>Defina sua senha de acesso para continuar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nova Senha</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmar Senha</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={handleVerify}>
              Ativar e Salvar Senha
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md text-center shadow-elevation py-8">
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <h2 className="text-xl font-semibold">Verificando...</h2>
            <p className="text-muted-foreground">Por favor, aguarde.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-4">
            <CheckCircle2 className="h-16 w-16 text-emerald-500" />
            <h2 className="text-2xl font-semibold text-emerald-600">Conta Ativada!</h2>
            <p className="text-muted-foreground">
              Sua conta foi ativada com sucesso. Você será redirecionado em instantes...
            </p>
            <Link to="/login">
              <Button variant="outline" className="mt-4">
                Ir para Login
              </Button>
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-4">
            <XCircle className="h-16 w-16 text-destructive" />
            <h2 className="text-2xl font-semibold text-destructive">Erro na Verificação</h2>
            <p className="text-muted-foreground">
              O link é inválido, expirou ou o e-mail já foi verificado.
            </p>
            <Link to="/login">
              <Button variant="default" className="mt-4">
                Ir para Login
              </Button>
            </Link>
          </div>
        )}
      </Card>
    </div>
  )
}
