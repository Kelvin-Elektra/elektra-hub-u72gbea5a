import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'

export default function Settings() {
  const [settings, setSettingsState] = useState<any>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const loadData = async () => {
    try {
      const setObj = await pb.collection('settings').getFirstListItem('')
      setSettingsState(setObj)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleLogoUpload = async () => {
    if (!logoFile || !settings?.id) return
    setIsUploading(true)
    try {
      const data = new FormData()
      data.append('logo', logoFile)
      await pb.collection('settings').update(settings.id, data)
      toast.success('Logo atualizada com sucesso.')
      setLogoFile(null)
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Erro ao fazer upload')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações Gerais</h1>
          <p className="text-muted-foreground">Gerencie a identidade visual do Hub.</p>
        </div>
      </div>

      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            <CardTitle>Identidade Visual</CardTitle>
          </div>
          <CardDescription>
            Logo do sistema (exibida no painel Admin e portal do Cliente).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="h-20 w-40 bg-muted/50 rounded-lg flex items-center justify-center border border-border overflow-hidden p-2 shrink-0">
            {settings?.logo ? (
              <img
                src={pb.files.getURL(settings, settings.logo)}
                alt="Logo"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <span className="text-xs text-muted-foreground font-medium">Sem logo</span>
            )}
          </div>
          <div className="flex-1 flex flex-col gap-3">
            <Label>Fazer upload de nova logo</Label>
            <div className="flex items-center gap-3">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                className="max-w-sm cursor-pointer file:text-primary file:font-medium"
              />
              <Button onClick={handleLogoUpload} disabled={!logoFile || isUploading}>
                {isUploading ? 'Salvando...' : 'Salvar Logo'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Recomendado: PNG ou SVG com fundo transparente.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
