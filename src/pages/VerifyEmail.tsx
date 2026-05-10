import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const { user } = useAuth()

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Verificando seu e-mail...')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Link de verificação inválido ou ausente.')
      return
    }

    const verifyToken = async () => {
      try {
        await pb.send('/backend/v1/verify-email', {
          method: 'POST',
          body: JSON.stringify({ token }),
        })

        if (user) {
          await pb.collection('users').authRefresh()
        }

        setStatus('success')
        setMessage('E-mail verificado com sucesso!')
      } catch (err: any) {
        setStatus('error')
        setMessage(err.response?.message || 'O link de verificação expirou ou é inválido.')
      }
    }

    verifyToken()
  }, [token, user])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md bg-card shadow-elevation text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            {status === 'loading' && <Loader2 className="h-12 w-12 text-primary animate-spin" />}
            {status === 'success' && <CheckCircle2 className="h-12 w-12 text-green-500" />}
            {status === 'error' && <XCircle className="h-12 w-12 text-destructive" />}
          </div>
          <CardTitle className="text-2xl">Verificação de E-mail</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          {status !== 'loading' && (
            <Button onClick={() => navigate('/login')} className="w-full">
              Ir para o Login
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
