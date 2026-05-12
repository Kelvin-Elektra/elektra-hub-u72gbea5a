import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function SSO() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const processedRef = useRef(false)

  useEffect(() => {
    const verifyToken = async () => {
      if (processedRef.current) return
      processedRef.current = true

      const token = searchParams.get('token')
      if (!token) {
        navigate('/login')
        return
      }

      try {
        const response = await pb.send<{ token: string; record: any }>('/backend/v1/sso-verify', {
          method: 'POST',
          body: JSON.stringify({ token }),
          headers: { 'Content-Type': 'application/json' },
        })

        if (response?.token && response?.record) {
          pb.authStore.save(response.token, response.record)
          toast.success('Login SSO realizado com sucesso!')

          setTimeout(() => {
            navigate(response.record.role === 'Admin' ? '/admin/modulos' : '/cliente')
          }, 100)
        } else {
          throw new Error('Resposta de autenticação inválida')
        }
      } catch (err) {
        console.error('SSO Error:', err)
        setError(getErrorMessage(err))
        toast.error('Sessão expirada ou inválida. Faça login novamente.')
        pb.authStore.clear()

        setTimeout(() => {
          navigate('/login')
        }, 3000)
      }
    }

    if (!user) {
      verifyToken()
    } else {
      navigate(user.role === 'Admin' ? '/admin/modulos' : '/cliente')
    }
  }, [searchParams, navigate, user])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {error ? (
          <div className="text-destructive font-medium">{error}</div>
        ) : (
          <>
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground font-medium">Autenticando via SSO...</p>
          </>
        )}
      </div>
    </div>
  )
}
