import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Plug } from 'lucide-react'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { toast } from 'sonner'

export default function Auth() {
  const { signIn, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [isLogin, setIsLogin] = useState(location.pathname !== '/register')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [companyName, setCompanyName] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    pb.collection('settings')
      .getFirstListItem('')
      .then((settings) => {
        if (settings.logo) {
          setLogoUrl(pb.files.getURL(settings, settings.logo))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (user) {
      navigate(user.role === 'Admin' ? '/admin' : '/cliente')
    }
  }, [user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isLogin) {
        const { error: signInError } = await signIn(email, password)
        if (signInError) throw signInError
      } else {
        if (password.length < 8) {
          throw new Error('A senha deve ter pelo menos 8 caracteres.')
        }

        const company = await pb.collection('companies').create({
          name: companyName,
          status: 'active',
        })

        await pb.collection('users').create({
          email,
          password,
          passwordConfirm: password,
          name,
          company_id: company.id,
          role: 'User',
        })

        toast.success('Cadastro realizado! Verifique seu e-mail para confirmar a conta.')

        const { error: signInError } = await signIn(email, password)
        if (signInError) throw signInError
      }
    } catch (err: any) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    setError('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-12">
      <Card className="w-full max-w-md bg-card border-border shadow-elevation">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-4">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-12 max-w-[200px] object-contain" />
            ) : (
              <div className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center">
                <Plug className="text-primary-foreground h-6 w-6" />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl font-display text-foreground">
            {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
          </CardTitle>
          <CardDescription>
            {isLogin ? 'Acesse o Elektra HUB' : 'Centralize suas operações com o Elektra HUB'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nome da Empresa</Label>
                  <Input
                    id="companyName"
                    placeholder="Sua Empresa LTDA"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    placeholder="João Silva"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            {error && <p className="text-sm text-destructive font-medium">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Aguarde...' : isLogin ? 'Entrar' : 'Cadastrar'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-border pt-6 mt-2">
          <p className="text-sm text-muted-foreground">
            {isLogin ? 'Não possui conta?' : 'Já tem cadastro?'}{' '}
            <button
              type="button"
              onClick={toggleMode}
              className="text-primary hover:text-primary/80 hover:underline font-medium transition-colors"
            >
              {isLogin ? 'Cadastre-se' : 'Faça login'}
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
