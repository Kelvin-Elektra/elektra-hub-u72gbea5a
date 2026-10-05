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
  Layers,
  HelpCircle,
} from 'lucide-react'

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
{ "action": "sync", "hub_user_id": "<id do usuário no HUB>", "hub_company_id": "<id da empresa no HUB>", "role_company": "admin", "user": { "id": "...", "email": "...", "name": "...", "role": "User_owner", "active": true, "company_id": "...", "phone": "...", "person_type": "PJ", "tax_id": "...", "company_name": "...", "postal_code": "...", "address": "...", "address_number": "...", "complement": "...", "neighborhood": "...", "city": "...", "state": "SP", "created": "...", "updated": "..." }, "company": { "id": "...", "hub_company_id": "...", "nome": "...", "name": "...", "tax_id": "...", "status": "active", "address": "...", "address_number": "...", "complement": "...", "neighborhood": "...", "city": "...", "state": "...", "postal_code": "...", "created": "...", "updated": "..." }, "subscription": { "id": "...", "status": "active", "max_users": 5, "module_id": "...", "user_id": "...", "price": 199.90, "next_billing_date": "..." } }

(b) Revogar EMPRESA (bloqueia todos os usuários dela; atenção: NÃO vem user.active):
{ "hub_user_id": "<id do usuário dono no HUB>", "hub_company_id": "<id da empresa no HUB>", "company": { "status": "inactive" } }

(c) Revogar USUÁRIO (bloqueia só ele; NÃO vem company.status):
{ "hub_user_id": "<id do usuário no HUB>", "hub_company_id": "<id da empresa no HUB>", "user": { "active": false } }

(d) Reativação = mesmas chamadas de (b) e (c) com "status": "active" / "active": true.
- Regra de interpretação: só aplique mudança de status quando o campo vier explicitamente no payload. company.status presente → muda status da empresa (todos os usuários dela). user.active presente → muda o status só desse usuário. Ausência do campo = não mexer no que não foi mandado.
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

  // Gestão de Faixas de Preço (module_pricing_tiers)
  const [tiers, setTiers] = useState<any[]>([])
  const [tiersModalModule, setTiersModalModule] = useState<any | null>(null)
  const [newTierMaxUsers, setNewTierMaxUsers] = useState<number>(5)
  const [newTierPrice, setNewTierPrice] = useState<number>(89)
  const [editingTierId, setEditingTierId] = useState<string | null>(null)
  const [savingTier, setSavingTier] = useState(false)

  const [isOpen, setIsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentId, setCurrentId] = useState('')

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [features, setFeatures] = useState('')
  const [basePrice, setBasePrice] = useState(0)
  const [status, setStatus] = useState('active')
  const [accessUrl, setAccessUrl] = useState('')
  const [endpointUrl, setEndpointUrl] = useState('')
  const [secretKeyName, setSecretKeyName] = useState('')

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadModules = async () => {
    try {
      setLoading(true)
      const [records, tierRecords] = await Promise.all([
        pb.collection('modules').getFullList({ sort: 'name' }),
        pb
          .collection('module_pricing_tiers')
          .getFullList({ sort: 'max_users' })
          .catch(() => []),
      ])
      setModules(records)
      setTiers(tierRecords)
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

  const handleOpenTiers = (mod: any) => {
    setTiersModalModule(mod)
    setEditingTierId(null)
    setNewTierMaxUsers(5)
    setNewTierPrice(mod.base_price || 89)
  }

  const handleSaveTier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tiersModalModule) return
    if (newTierMaxUsers < 1 || newTierPrice < 0) {
      toast.error('Informe valores válidos para limite de usuários e preço.')
      return
    }

    try {
      setSavingTier(true)
      if (editingTierId) {
        await pb.collection('module_pricing_tiers').update(editingTierId, {
          max_users: Number(newTierMaxUsers),
          price: Number(newTierPrice),
        })
        toast.success('Faixa de preço atualizada!')
      } else {
        await pb.collection('module_pricing_tiers').create({
          module_id: tiersModalModule.id,
          max_users: Number(newTierMaxUsers),
          price: Number(newTierPrice),
        })
        toast.success('Faixa de preço adicionada!')
      }
      setEditingTierId(null)
      setNewTierMaxUsers(5)
      setNewTierPrice(tiersModalModule.base_price || 89)
      loadModules()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar faixa')
    } finally {
      setSavingTier(false)
    }
  }

  const handleDeleteTier = async (tierId: string) => {
    if (!confirm('Deseja excluir esta faixa de preço?')) return
    try {
      await pb.collection('module_pricing_tiers').delete(tierId)
      toast.success('Faixa excluída!')
      loadModules()
    } catch (err: any) {
      toast.error('Erro ao excluir faixa')
    }
  }

  const handleOpenNew = () => {
    setIsEditing(false)
    setCurrentId('')
    setName('')
    setDescription('')
    setFeatures('')
    setBasePrice(0)
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
      formData.append('base_price', basePrice.toString())
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
            Gerencie os módulos do ecossistema e faixas de preço.
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
                      onClick={() => handleOpenTiers(mod)}
                      title="Gerenciar faixas de preço por quantidade de usuários"
                      className="text-primary hover:bg-primary/10"
                    >
                      <Layers className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(mod)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(mod.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="mt-2">{mod.name}</CardTitle>
                <CardDescription>
                  Preço Base: R$ {(mod.base_price || 0).toFixed(2)} / mês
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {mod.description || 'Sem descrição'}
                </p>

                {/* Faixas de preço cadastradas para este módulo */}
                <div className="border-t pt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5 text-primary" /> Faixas de Preço:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenTiers(mod)}
                      className="text-primary hover:underline text-xs"
                    >
                      Configurar
                    </button>
                  </div>
                  {tiers.filter((t) => t.module_id === mod.id).length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      Nenhuma faixa (usa preço base).
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {tiers
                        .filter((t) => t.module_id === mod.id)
                        .sort((a, b) => a.max_users - b.max_users)
                        .map((tier) => (
                          <span
                            key={tier.id}
                            className="inline-flex items-center text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium"
                          >
                            Até {tier.max_users} usuários: R${' '}
                            {Number(tier.price).toFixed(2).replace('.', ',')}
                          </span>
                        ))}
                    </div>
                  )}
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
                  <Label>Nome</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Preço Base (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={basePrice}
                    onChange={(e) => setBasePrice(parseFloat(e.target.value))}
                    required
                  />
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

              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  />
                </div>
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

      {/* Modal de Faixas de Preço por Usuários */}
      <Dialog open={!!tiersModalModule} onOpenChange={(open) => !open && setTiersModalModule(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Faixas de Preço por Usuários: {tiersModalModule?.name}
            </DialogTitle>
            <CardDescription>
              Configure faixas de valores de acordo com a quantidade de usuários contratada. Ex.:
              até 5 usuários = R$ 89,00; até 10 usuários = R$ 159,00.
            </CardDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Formulário de adicionar/editar faixa */}
            <form onSubmit={handleSaveTier} className="p-3 bg-muted/40 rounded-lg border space-y-3">
              <p className="text-xs font-semibold text-foreground">
                {editingTierId ? 'Editar Faixa de Preço' : 'Adicionar Nova Faixa'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Limite de Usuários (Até X)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={newTierMaxUsers}
                    onChange={(e) => setNewTierMaxUsers(parseInt(e.target.value) || 1)}
                    placeholder="Ex: 5"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Preço Mensal (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={newTierPrice}
                    onChange={(e) => setNewTierPrice(parseFloat(e.target.value) || 0)}
                    placeholder="Ex: 89.00"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                {editingTierId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingTierId(null)
                      setNewTierMaxUsers(5)
                      setNewTierPrice(tiersModalModule.base_price || 89)
                    }}
                  >
                    Cancelar Edição
                  </Button>
                )}
                <Button type="submit" size="sm" disabled={savingTier}>
                  {savingTier
                    ? 'Salvando...'
                    : editingTierId
                      ? 'Atualizar Faixa'
                      : 'Adicionar Faixa'}
                </Button>
              </div>
            </form>

            {/* Lista das faixas cadastradas para este módulo */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Faixas Existentes (Ordenadas)</Label>
              <div className="border rounded-md divide-y max-h-60 overflow-y-auto">
                {tiers.filter((t) => t.module_id === tiersModalModule?.id).length === 0 ? (
                  <p className="p-4 text-center text-xs text-muted-foreground">
                    Nenhuma faixa cadastrada. O módulo cobrará o Preço Base fixo (R${' '}
                    {(tiersModalModule?.base_price || 0).toFixed(2)}).
                  </p>
                ) : (
                  tiers
                    .filter((t) => t.module_id === tiersModalModule?.id)
                    .sort((a, b) => a.max_users - b.max_users)
                    .map((tier) => (
                      <div
                        key={tier.id}
                        className="p-3 flex items-center justify-between hover:bg-muted/30"
                      >
                        <div>
                          <p className="text-sm font-semibold">Até {tier.max_users} usuários</p>
                          <p className="text-xs text-muted-foreground">
                            Valor mensal: R$ {Number(tier.price).toFixed(2).replace('.', ',')}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingTierId(tier.id)
                              setNewTierMaxUsers(tier.max_users)
                              setNewTierPrice(tier.price)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTier(tier.id)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setTiersModalModule(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
