import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { KeyRound, Webhook } from 'lucide-react'

export default function Settings() {
  const handleSave = () => {
    toast.success('Configurações salvas com sucesso!')
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie integrações e parâmetros globais do Master Hub.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" /> Integração Asaas
          </CardTitle>
          <CardDescription>Credenciais de acesso à API de pagamentos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Chave de API (Produção)</Label>
            <Input type="password" defaultValue="sk_live_1234567890abcdef_placeholder" />
            <p className="text-xs text-muted-foreground">
              A chave é criptografada em repouso pelo sistema.
            </p>
          </div>
          <Button onClick={handleSave}>Salvar Credenciais</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" /> Webhooks do Ecossistema
          </CardTitle>
          <CardDescription>
            Endpoints para notificação em tempo real de eventos (Source of Truth).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Elektra CRM Endpoint</Label>
            <Input defaultValue="https://api.elektracrm.com/v1/webhooks/hub-sync" />
          </div>
          <div className="space-y-2">
            <Label>Nexus ERP Endpoint</Label>
            <Input defaultValue="https://api.nexuserp.com/webhook/receive" />
          </div>
          <Button onClick={handleSave}>Atualizar Endpoints</Button>
        </CardContent>
      </Card>
    </div>
  )
}
