import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, Lock, CheckCircle2, PackageSearch } from 'lucide-react'
import { getUserSubscriptions, getModules, type Subscription, type Module } from '@/services/api'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'

export default function Portal() {
  const { user } = useAuth()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [modules, setModules] = useState<Module[]>([])

  const loadData = async () => {
    if (!user?.id) return
    try {
      const [subs, mods] = await Promise.all([getUserSubscriptions(user.id), getModules()])
      setSubscriptions(subs)
      setModules(mods.filter((m) => m.status !== 'deprecated'))
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [user?.id])

  useRealtime('subscriptions', loadData)
  useRealtime('modules', loadData)

  const activeSubs = subscriptions.filter((s) => s.status === 'active')
  const activeModuleIds = activeSubs.map((s) => s.module_id)

  const myModules = modules.filter((m) => activeModuleIds.includes(m.id))
  const availableModules = modules.filter((m) => !activeModuleIds.includes(m.id))

  const getLaunchUrl = (mod: Module) => {
    if (mod.access_url) return mod.access_url
    try {
      if (!mod.endpoint_url) return '#'
      const url = new URL(mod.endpoint_url)
      return `${url.protocol}//${url.host}`
    } catch {
      return '#'
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Meu Launchpad</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Acesse seus módulos ativos ou descubra novas soluções para o seu negócio.
        </p>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-6 w-6 text-primary" /> Módulos Ativos
        </h2>
        {myModules.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {myModules.map((mod) => (
              <Card
                key={mod.id}
                className="flex flex-col border-primary/20 bg-card hover:shadow-md transition-shadow"
              >
                <CardHeader>
                  <CardTitle className="text-xl">{mod.name}</CardTitle>
                  <CardDescription>Acesso liberado</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    Utilize este módulo para gerenciar as operações do seu negócio com eficiência.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button className="w-full gap-2 font-semibold" asChild>
                    <a href={getLaunchUrl(mod)} target="_blank" rel="noopener noreferrer">
                      Acessar <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-2 bg-muted/30">
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground text-center">
              <PackageSearch className="h-10 w-10 mb-4 opacity-50" />
              <p className="text-lg font-medium text-foreground">Nenhum módulo ativo no momento.</p>
              <p className="mt-1">Entre em contato para ativar novas soluções.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-6 pt-4 border-t">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Lock className="h-6 w-6 text-muted-foreground" /> Soluções Disponíveis
        </h2>
        {availableModules.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {availableModules.map((mod) => (
              <Card
                key={mod.id}
                className="flex flex-col opacity-80 hover:opacity-100 transition-opacity bg-muted/10"
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{mod.name}</CardTitle>
                    <Badge variant="secondary">Upgrade</Badge>
                  </div>
                  <CardDescription className="text-primary font-medium mt-1">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      mod.base_price,
                    )}{' '}
                    / mês
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    Entre em contato com nosso time comercial para ativar este módulo e expandir
                    suas operações.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full text-muted-foreground" disabled>
                    Contatar Comercial
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Todos os módulos disponíveis já estão ativos para você.
          </p>
        )}
      </div>
    </div>
  )
}
