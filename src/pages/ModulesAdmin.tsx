import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import pb from '@/lib/pocketbase/client'
import { toast } from 'sonner'
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Users,
} from 'lucide-react'
import { formatCurrencyBRL } from '@/lib/formatters'

const INTEGRATION_PROMPT_TEMPLATE = `Contexto: O [NOME_DO_MÓDULO] ([DESCRIÇÃO_DO_MÓDULO]) é um módulo do ecossistema Elektra. O Elektra HUB é a fonte da verdade de usuários, empresas e assinaturas. O módulo nunca cria contas próprias: recebe tudo do HUB via sync e autentica via SSO.

FASE 1 — Schema primeiro (antes de qualquer API)
Crie/aplique migrations garantindo estas coleções e campos:
- companies: id (gerado pelo schema local — não aceita ID externo), hub_company_id (index, único, obrigatório — é por ele que o mapeamento com o HUB acontece), nome, tax_id, status, campos de endereço.
- users: id (gerado localmente), hub_user_id (index, único, obrigatório), email, name, role (User_owner/User_employee), active, phone, company (relação com companies), role_company (admin/user), employee_access ou campo equivalente para permissão por módulo.
- sync_logs (opcional): registro de cada sync recebido.
Regra fundamental do builder: nunca popule o campo id com valor vindo do HUB. Todo mapeamento é por hub_user_id / hub_company_id.

FASE 2 — Endpoint de sincronização
- Crie POST /backend/v1/hub-sync (endpoint interno do backend do módulo, não domínio público).
- Segurança: validar o header X-Secret (ou Authorization: Bearer) contra a variável de ambiente HUB_SECRET do backend do módulo (o valor dela é o mesmo cadastrado no HUB como secret ELEKTRA_FLOW). Inválida/ausente → 401 {"status":401,"data":{},"message":"Invalid or missing secret."}.
- Idempotente: reenvios do mesmo registro atualizam, nunca duplicam.
- Upsert da empresa por hub_company_id e do usuário por hub_user_id (nunca pelo id local).
- O HUB envia três formatos de payload. O módulo deve tratar cada um:

(a) Sync completo — criar/atualizar dados:
{ "action": "sync", "hub_user_id": "<id do usuário no HUB>", "hub_company_id": "<id da empresa no HUB>", "role_company": "admin", "name": "Nome", "email": "usuario@exemplo.com", "user": { "id": "...", "email": "usuario@exemplo.com", "name": "...", "role": "User_owner", "active": true, "company_id": "...", "phone": "...", "person_type": "PJ", "tax_id": "...", "company_name": "...", "postal_code": "...", "address": "...", "address_number": "...", "complement": "...", "neighborhood": "...", "city": "...", "state": "SP", "created": "...", "updated": "..." }, "company": { "id": "...", "hub_company_id": "...", "nome": "...", "name": "...", "tax_id": "...", "status": "active", "address": "...", "address_number": "...", "complement": "...", "neighborhood": "...", "city": "...", "state": "...", "postal_code": "...", "created": "...", "updated": "..." }, "subscription": { "id": "...", "status": "active", "max_users": 5, "module_id": "...", "user_id": "...", "price": 199.90, "next_billing_date": "..." } }

(b) Revogar EMPRESA (bloqueia todos os usuários dela; atenção: NÃO vem user.active):
{ "hub_user_id": "<id do usuário dono no HUB>", "hub_company_id": "<id da empresa no HUB>", "email": "dono@exemplo.com", "company": { "status": "inactive" } }

(c) Revogar USUÁRIO (bloqueia só ele; NÃO vem company.status):
{ "hub_user_id": "<id do usuário no HUB>", "hub_company_id": "<id da empresa no HUB>", "email": "usuario@exemplo.com", "user": { "active": false, "email": "usuario@exemplo.com" } }
Nota: quando o usuário for excluído definitivamente no HUB (não apenas inativado), o payload vem com deleted: true na raiz:
{ "hub_user_id": "<id do usuário no HUB>", "hub_company_id": "<id da empresa no HUB>", "email": "usuario@exemplo.com", "deleted": true, "user": { "active": false, "email": "usuario@exemplo.com" } }

(d) Reativação = mesmas chamadas de (b) e (c) com "status": "active" / "active": true.
- Regra de interpretação: só aplique mudança de status quando o campo vier explicitamente no payload. company.status presente → muda status da empresa (todos os usuários dela). user.active presente → muda o status só desse usuário. Ausência do campo = não mexer no que não foi mandado.
- Resolução de usuário: localize o usuário local SEMPRE por hub_user_id. Se não encontrar nenhum registro com esse hub_user_id, use o email (presente na raiz do payload e dentro de user) como chave alternativa de resolução — o e-mail é único em todo o ecossistema. Ao encontrar por e-mail um registro cujo hub_user_id difere ou está vazio, atualize o hub_user_id dele para o valor recebido (auto-correção do mapeamento). Se não encontrar por nenhuma das duas chaves num payload de revogação/exclusão, responda 2xx e ignore (nada a revogar); num payload de sync/ativação, crie o registro.
- Na revogação por exclusão de usuário: quando o usuário for excluído definitivamente no HUB (não apenas inativado), o payload vem com user.active: false e deleted: true na raiz — nesse caso, apague o registro local do usuário (não apenas inative).
- hub_user_id e hub_company_id vêm em TODA chamada, mesmo em revogação parcial — use-os para localizar os registros.
- Aplicar a revogação: usuário inativado ou empresa inactive → bloquear acesso imediatamente (inclusive sessões ativas).
- Responder 2xx em sucesso (o HUB registra o resultado em sync_logs).

FASE 3 — Login via SSO
- O HUB gera o link https://[DOMINIO_DO_MODULO]/?sso_token=JWT (HS256 assinado com SSO_SECRET, válido por 7 dias; claims: id, name, email, phone, role, company_id, role_company, company_name, module_id).
- O botão "Acessar módulo" só aparece no HUB se a assinatura do módulo estiver active/trialing — mas o módulo DEVE revalidar sempre.
- Ao receber o sso_token na URL, validar chamando POST https://hub.elektrasolucoes.tech/backend/v1/sso-verify com body {"token": "<sso_token>"} — NUNCA via GET (o HUB falha com GET). Resposta 200: {"id": "<hub_user_id>", "status_token": "active"|"inactive"}. 401 = token inválido/expirado; 403 = sem assinatura ativa ou sem acesso de colaborador; 404 = usuário nunca sincronizado.
- O id retornado é o ID do HUB: localize o usuário local POR hub_user_id, não pelo id da tabela. Se não houver registro com esse hub_user_id, mostrar "acesso indisponível — sincronização pendente".
- Se status_token = inactive ou resposta != 200, bloquear com "acesso indisponível — fale com o dono da conta". Nunca autenticar.
- Alternativa segura: validar o JWT localmente com a SSO_SECRET compartilhada e conferir os claims.
- Autenticada a sessão, aplicar permissões conforme role_company (admin = dono ou colaborador autorizado; user = acesso comum).

Ordem de implementação: 1) migrations/schema, 2) endpoint hub-sync, 3) SSO. Sem imprecisão nos nomes: os campos do payload chegam exatamente como exemplificado acima.`

export default function ModulesAdmin() {
  const [modules, setModules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Helper do prompt de integração
  const [isHelperOpen, setIsHelperOpen] = useState(false)
  const [copiedHelper, setCopiedHelper] = useState(false)

  const [isOpen, setIsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentId, setCurrentId] = useState('')

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [features, setFeatures] = useState('')
  const [basePrice, setBasePrice] = useState(0)
  const [pricePerUser, setPricePerUser] = useState(0)
  const [status, setStatus] = useState('active')
  const [accessUrl, setAccessUrl] = useState('')
  const [endpointUrl, setEndpointUrl] = useState('')
  const [secretKeyName, setSecretKeyName] = useState('')

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadModules = async () => {
    try {
      setLoading(true)
      const records = await pb.collection('modules').getFullList({ sort: 'name' })
      setModules(records)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadModules()
  }, [])

  const handleCopyHelper = () => {
    navigator.clipboard.writeText(INTEGRATION_PROMPT_TEMPLATE)
    setCopiedHelper(true)
    toast.success('Prompt copiado para a área de transferência!')
    setTimeout(() => setCopiedHelper(false), 2500)
  }

  const handleOpenNew = () => {
    setIsEditing(false)
    setCurrentId('')
    setName('')
    setDescription('')
    setFeatures('')
    setBasePrice(0)
    setPricePerUser(0)
    setStatus('active')
    setAccessUrl('')
    setEndpointUrl('')
    setSecretKeyName('')
    setLogoFile(null)
    setIsOpen(true)
  }

  const handleOpenEdit = (mod: any) => {
    setIsEditing(true)
    setCurrentId(mod.id)
    setName(mod.name)
    setDescription(mod.description || '')
    setFeatures(mod.features || '')
    setBasePrice(mod.base_price || 0)
    setPricePerUser(mod.price_per_user || 0)
    setStatus(mod.status)
    setAccessUrl(mod.access_url || '')
    setEndpointUrl(mod.endpoint_url || '')
    setSecretKeyName(mod.secret_key_name || '')
    setLogoFile(null)
    setIsOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este módulo?')) return
    try {
      await pb.collection('modules').delete(id)
      toast.success('Módulo excluído')
      loadModules()
    } catch (err) {
      toast.error('Erro ao excluir')
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('description', description)
      formData.append('features', features)
      formData.append('base_price', (basePrice || 0).toString())
      formData.append('price_per_user', (pricePerUser || 0).toString())
      formData.append('status', status)
      formData.append('access_url', accessUrl)
      formData.append('endpoint_url', endpointUrl)
      formData.append('secret_key_name', secretKeyName)

      if (logoFile) {
        formData.append('logo', logoFile)
      }

      if (isEditing) {
        await pb.collection('modules').update(currentId, formData)
        toast.success('Módulo atualizado')
      } else {
        await pb.collection('modules').create(formData)
        toast.success('Módulo criado')
      }
      setIsOpen(false)
      loadModules()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar módulo')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Módulos</h1>
          <p className="text-muted-foreground">
            Gerencie os módulos do ecossistema, preços base e valor adicional por colaborador.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsHelperOpen(!isHelperOpen)}
            className="gap-2 border-primary/30 text-primary hover:bg-primary/5"
          >
            <HelpCircle className="h-4 w-4" />
            Helper: Prompt de integração
            {isHelperOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button onClick={handleOpenNew}>
            <Plus className="h-4 w-4 mr-2" /> Novo Módulo
          </Button>
        </div>
      </div>

      {/* Helper Expansível do Prompt de Integração */}
      {isHelperOpen && (
        <Card className="border-primary/20 bg-blue-50/40 animate-fade-in shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg flex items-center gap-2 text-primary">
                  <HelpCircle className="h-5 w-5" />
                  Helper: Prompt de integração de módulo
                </CardTitle>
                <CardDescription className="text-xs">
                  Template oficial pronto para ser copiado e enviado para a IA/builder construir a
                  integração do novo módulo.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant={copiedHelper ? 'secondary' : 'default'}
                onClick={handleCopyHelper}
                className="gap-2 shrink-0"
              >
                {copiedHelper ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedHelper ? 'Copiado!' : 'Copiar Prompt'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="p-4 bg-white border rounded-md text-xs font-mono whitespace-pre-wrap max-h-80 overflow-y-auto text-slate-800 leading-relaxed shadow-inner">
                {INTEGRATION_PROMPT_TEMPLATE}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : modules.length === 0 ? (
          <p className="text-muted-foreground">Nenhum módulo encontrado.</p>
        ) : (
          modules.map((mod) => (
            <Card key={mod.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  {mod.logo ? (
                    <img
                      src={pb.files.getURL(mod, mod.logo)}
                      alt="Logo"
                      className="h-10 object-contain"
                    />
                  ) : (
                    <div className="h-10 w-10 bg-primary/10 rounded flex items-center justify-center font-bold text-primary">
                      {mod.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(mod)}
                      title="Editar módulo e preços"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(mod.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="mt-2">{mod.name}</CardTitle>
                <CardDescription className="flex flex-col gap-0.5">
                  <span className="font-medium text-foreground">
                    Base (até 1 usuário): {formatCurrencyBRL(mod.base_price)} / mês
                  </span>
                  <span className="text-xs text-muted-foreground">
                    + {formatCurrencyBRL(mod.price_per_user)} por usuário adicional
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {mod.description || 'Sem descrição'}
                </p>

                {/* Estrutura de Preço Limpa */}
                <div className="border-t pt-2.5 bg-slate-50/70 p-2.5 rounded-lg space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-slate-700">
                    <span className="flex items-center gap-1 font-medium">
                      <Users className="h-3.5 w-3.5 text-primary" /> Usuário base (incluso):
                    </span>
                    <span className="font-semibold text-foreground">
                      {formatCurrencyBRL(mod.base_price)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>A cada usuário a mais:</span>
                    <span className="font-semibold text-primary">
                      + {formatCurrencyBRL(mod.price_per_user)} / mês
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground pt-1 border-t border-slate-200">
                    Exemplo: 5 usuários ={' '}
                    {formatCurrencyBRL((mod.base_price || 0) + 4 * (mod.price_per_user || 0))} / mês
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-2 text-sm">
                  <span className="font-semibold">Status:</span>
                  <span
                    className={
                      mod.status === 'active'
                        ? 'text-emerald-600 font-medium'
                        : mod.status === 'maintenance'
                          ? 'text-amber-600 font-medium'
                          : 'text-destructive font-medium'
                    }
                  >
                    {mod.status === 'active'
                      ? 'Ativo'
                      : mod.status === 'maintenance'
                        ? 'Em Manutenção'
                        : 'Descontinuado'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Editar Módulo' : 'Novo Módulo'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Módulo</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="maintenance">Manutenção</SelectItem>
                      <SelectItem value="deprecated">Descontinuado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-3 bg-muted/40 rounded-lg border space-y-3">
                <p className="text-xs font-semibold text-foreground">
                  Modelo de Preço por Usuário (Base + Adicional por Usuário Extra)
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Preço Base (até 1 usuário) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={basePrice}
                      onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
                      placeholder="Ex: 89.00"
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Valor mensal com 1 usuário incluso
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Preço por Usuário Adicional *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={pricePerUser}
                      onChange={(e) => setPricePerUser(parseFloat(e.target.value) || 0)}
                      placeholder="Ex: 19.90"
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Valor a mais por cada colaborador extra
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição Curta</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Aparece no card do cliente"
                />
              </div>

              <div className="space-y-2">
                <Label>Features (uma por linha)</Label>
                <Textarea
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
                  placeholder="Recurso 1&#10;Recurso 2"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Logo do Módulo</Label>
                <Input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                />
              </div>

              <div className="space-y-2">
                <Label>URL de Acesso (Client App)</Label>
                <Input
                  type="url"
                  value={accessUrl}
                  onChange={(e) => setAccessUrl(e.target.value)}
                  placeholder="https://crm.exemplo.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Webhook Endpoint</Label>
                  <Input
                    type="url"
                    value={endpointUrl}
                    onChange={(e) => setEndpointUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome da Chave Secreta (Env)</Label>
                  <Input
                    value={secretKeyName}
                    onChange={(e) => setSecretKeyName(e.target.value)}
                    placeholder="ELEKTRA_CRM_SECRET"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
