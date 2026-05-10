import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { MailWarning } from 'lucide-react'

export default function Unverified() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = () => {
    signOut()
    navigate('/login')
  }

  if (!user) {
    navigate('/login')
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card p-8 rounded-xl shadow-elevation text-center space-y-6">
        <MailWarning className="h-16 w-16 text-yellow-500 mx-auto" />
        <h1 className="text-2xl font-bold text-foreground">Confirme seu E-mail</h1>
        <p className="text-muted-foreground">
          Enviamos um link de confirmação para o e-mail{' '}
          <strong className="text-foreground">{user.email}</strong>. Por favor, verifique sua caixa
          de entrada e spam para ativar sua conta.
        </p>
        <div className="space-y-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={handleSignOut} className="w-full">
            Sair e voltar ao Login
          </Button>
        </div>
      </div>
    </div>
  )
}
