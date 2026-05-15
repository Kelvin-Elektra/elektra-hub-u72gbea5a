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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Plug } from 'lucide-react'
import { getErrorMessage, extractFieldErrors } from '@/lib/pocketbase/errors'
import { toast } from 'sonner'

export default function Auth() {
  const { signIn, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [isLogin, setIsLogin] = useState(location.pathname !== '/register')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [personType, setPersonType] = useState<'PF' | 'PJ'>('PJ')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [taxId, setTaxId] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [address, setAddress] = useState('')
  const [addressNumber, setAddressNumber] = useState('')
  const [complement, setComplement] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')

  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
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
      if (!user.verified) {
        navigate('/unverified')
      } else {
        navigate(user.role === 'Admin' ? '/admin' : '/cliente')
      }
    }
  }, [user, navigate])

  const handleCepChange = async (val: string) => {
    const cep = val.replace(/\D/g, '')
    setPostalCode(cep)
    if (cep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
        const data = await res.json()
        if (!data.erro) {
          setAddress(data.logradouro)
          setNeighborhood(data.bairro)
          setCity(data.localidade)
          setState(data.uf)
        }
      } catch (e) {
        console.error(e)
      }
    }
  }

  const formatTaxId = (val: string) => {
    const digits = val.replace(/\D/g, '')
    if (personType === 'PF') {
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').substring(0, 14)
    }
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5').substring(0, 18)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setFieldErrors({})

    let hasMissing = false
    const newFieldErrors: Record<string, string> = {}

    if (isLogin) {
      if (!email) {
        hasMissing = true
        newFieldErrors.email = 'Obrigatório'
      }
      if (!password) {
        hasMissing = true
        newFieldErrors.password = 'Obrigatório'
      }
    } else {
      if (!name) {
        hasMissing = true
        newFieldErrors.name = 'Obrigatório'
      }
      if (!companyName) {
        hasMissing = true
        newFieldErrors.company_name = 'Obrigatório'
      }

      if (!taxId) {
        hasMissing = true
        newFieldErrors.tax_id = 'Obrigatório'
      } else {
        const cleanTaxId = taxId.replace(/\D/g, '')
        if (personType === 'PF' && cleanTaxId.length !== 11) {
          hasMissing = true
          newFieldErrors.tax_id = 'CPF inválido.'
        }
        if (personType === 'PJ' && cleanTaxId.length !== 14) {
          hasMissing = true
          newFieldErrors.tax_id = 'CNPJ inválido.'
        }
      }

      if (!phone) {
        hasMissing = true
        newFieldErrors.phone = 'Obrigatório'
      }

      if (!email) {
        hasMissing = true
        newFieldErrors.email = 'Obrigatório'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        hasMissing = true
        newFieldErrors.email = 'E-mail inválido.'
      }

      if (!password) {
        hasMissing = true
        newFieldErrors.password = 'Obrigatório'
      } else if (password.length < 8) {
        hasMissing = true
        newFieldErrors.password = 'Mínimo de 8 caracteres.'
      }

      if (!postalCode) {
        hasMissing = true
        newFieldErrors.postal_code = 'Obrigatório'
      } else {
        const cleanCep = postalCode.replace(/\D/g, '')
        if (cleanCep.length !== 8) {
          hasMissing = true
          newFieldErrors.postal_code = 'CEP inválido.'
        }
      }

      if (!address) {
        hasMissing = true
        newFieldErrors.address = 'Obrigatório'
      }
      if (!addressNumber) {
        hasMissing = true
        newFieldErrors.address_number = 'Obrigatório'
      }
      if (!neighborhood) {
        hasMissing = true
        newFieldErrors.neighborhood = 'Obrigatório'
      }
      if (!city) {
        hasMissing = true
        newFieldErrors.city = 'Obrigatório'
      }
      if (!state) {
        hasMissing = true
        newFieldErrors.state = 'Obrigatório'
      }
    }

    if (hasMissing) {
      setFieldErrors(newFieldErrors)
      setError('Por favor, verifique os campos destacados.')
      setLoading(false)
      return
    }

    try {
      if (isLogin) {
        const { error: signInError } = await signIn(email, password)
        if (signInError) throw signInError
      } else {
        try {
          let companyRecord: any = null
          try {
            companyRecord = await pb.collection('companies').create({
              name: companyName || name,
              status: 'active',
              tax_id: taxId.replace(/\D/g, ''),
            })
          } catch (companyErr: any) {
            console.error('Company Creation failed:', companyErr)
            throw companyErr
          }

          try {
            await pb.collection('users').create({
              email,
              password,
              passwordConfirm: password,
              name,
              phone,
              role: 'User_owner',
              is_owner: true,
              person_type: personType,
              tax_id: taxId.replace(/\D/g, ''),
              company_name: companyName,
              company_id: companyRecord.id,
              active: true,
              postal_code: postalCode,
              address,
              address_number: addressNumber,
              complement,
              neighborhood,
              city,
              state,
            })
          } catch (userErr: any) {
            console.error('User Creation failed:', userErr)
            throw userErr
          }
        } catch (err: any) {
          if (
            err.response?.data?.email?.code === 'validation_not_unique' ||
            err.response?.data?.email?.message?.includes('unique')
          ) {
            if (err.response?.data?.email) {
              err.response.data.email.message = 'Este e-mail já está cadastrado.'
            }
          }
          throw err
        }

        toast.success('Cadastro realizado com sucesso!')

        try {
          await pb.collection('users').requestVerification(email)
        } catch (e) {
          console.error('Failed to request verification email', e)
        }

        const { error: signInError } = await signIn(email, password)
        if (signInError) throw signInError

        navigate('/unverified')
      }
    } catch (err: any) {
      const extractedErrors = extractFieldErrors(err)
      if (Object.keys(extractedErrors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...extractedErrors }))
        setError('Por favor, verifique os campos destacados.')
      } else {
        setError(getErrorMessage(err))
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    setError('')
    setFieldErrors({})
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-12">
      <Card
        className={`w-full ${isLogin ? 'max-w-md' : 'max-w-2xl'} bg-card border-border shadow-md`}
      >
        <CardHeader className="space-y-2 text-center">
          {isLogin && (
            <div className="flex justify-center mb-4">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-12 max-w-[200px] object-contain" />
              ) : (
                <div className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center">
                  <Plug className="text-primary-foreground h-6 w-6" />
                </div>
              )}
            </div>
          )}
          <CardTitle className="text-2xl font-display text-foreground">
            {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
          </CardTitle>
          <CardDescription>
            {isLogin ? 'Acesse o Elektra HUB' : 'Centralize suas operações com o Elektra HUB'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-3 pb-2">
                  <Label>Tipo de Pessoa</Label>
                  <RadioGroup
                    defaultValue="PJ"
                    value={personType}
                    onValueChange={(val: 'PF' | 'PJ') => {
                      setPersonType(val)
                      setTaxId('')
                    }}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="PF" id="pf" />
                      <Label htmlFor="pf">Pessoa Física</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="PJ" id="pj" />
                      <Label htmlFor="pj">Pessoa Jurídica</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Nome Completo {personType === 'PJ' && '/ Responsável'}
                    </Label>
                    <Input
                      id="name"
                      placeholder="João Silva"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={fieldErrors.name ? 'border-destructive' : ''}
                    />
                    {fieldErrors.name && (
                      <p className="text-xs text-destructive">{fieldErrors.name}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Nome da Empresa</Label>
                    <Input
                      id="companyName"
                      placeholder="Sua Empresa"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className={fieldErrors.company_name ? 'border-destructive' : ''}
                    />
                    {fieldErrors.company_name && (
                      <p className="text-xs text-destructive">{fieldErrors.company_name}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taxId">{personType === 'PJ' ? 'CNPJ' : 'CPF'}</Label>
                    <Input
                      id="taxId"
                      placeholder={personType === 'PJ' ? '00.000.000/0001-00' : '000.000.000-00'}
                      value={taxId}
                      onChange={(e) => setTaxId(formatTaxId(e.target.value))}
                      className={fieldErrors.tax_id ? 'border-destructive' : ''}
                    />
                    {fieldErrors.tax_id && (
                      <p className="text-xs text-destructive">{fieldErrors.tax_id}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone (Celular)</Label>
                    <Input
                      id="phone"
                      placeholder="(00) 00000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={fieldErrors.phone ? 'border-destructive' : ''}
                    />
                    {fieldErrors.phone && (
                      <p className="text-xs text-destructive">{fieldErrors.phone}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="usuario@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={fieldErrors.email ? 'border-destructive' : ''}
                    />
                    {fieldErrors.email && (
                      <p className="text-xs text-destructive">{fieldErrors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={fieldErrors.password ? 'border-destructive' : ''}
                    />
                    {fieldErrors.password && (
                      <p className="text-xs text-destructive">{fieldErrors.password}</p>
                    )}
                  </div>
                </div>

                <div className="border-t my-4 pt-4">
                  <h3 className="text-sm font-medium mb-4">Endereço de Faturamento</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="postalCode">CEP</Label>
                      <Input
                        id="postalCode"
                        placeholder="00000-000"
                        value={postalCode}
                        onChange={(e) => handleCepChange(e.target.value)}
                        maxLength={9}
                        className={fieldErrors.postal_code ? 'border-destructive' : ''}
                      />
                      {fieldErrors.postal_code && (
                        <p className="text-xs text-destructive">{fieldErrors.postal_code}</p>
                      )}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">Logradouro</Label>
                      <Input
                        id="address"
                        placeholder="Rua Exemplo"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className={fieldErrors.address ? 'border-destructive' : ''}
                      />
                      {fieldErrors.address && (
                        <p className="text-xs text-destructive">{fieldErrors.address}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="addressNumber">Número</Label>
                      <Input
                        id="addressNumber"
                        placeholder="123"
                        value={addressNumber}
                        onChange={(e) => setAddressNumber(e.target.value)}
                        className={fieldErrors.address_number ? 'border-destructive' : ''}
                      />
                      {fieldErrors.address_number && (
                        <p className="text-xs text-destructive">{fieldErrors.address_number}</p>
                      )}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="complement">Complemento</Label>
                      <Input
                        id="complement"
                        placeholder="Apto 45"
                        value={complement}
                        onChange={(e) => setComplement(e.target.value)}
                        className={fieldErrors.complement ? 'border-destructive' : ''}
                      />
                      {fieldErrors.complement && (
                        <p className="text-xs text-destructive">{fieldErrors.complement}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="neighborhood">Bairro</Label>
                      <Input
                        id="neighborhood"
                        placeholder="Centro"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        className={fieldErrors.neighborhood ? 'border-destructive' : ''}
                      />
                      {fieldErrors.neighborhood && (
                        <p className="text-xs text-destructive">{fieldErrors.neighborhood}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        placeholder="São Paulo"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className={fieldErrors.city ? 'border-destructive' : ''}
                      />
                      {fieldErrors.city && (
                        <p className="text-xs text-destructive">{fieldErrors.city}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">Estado (UF)</Label>
                      <Input
                        id="state"
                        placeholder="SP"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        maxLength={2}
                        className={fieldErrors.state ? 'border-destructive' : ''}
                      />
                      {fieldErrors.state && (
                        <p className="text-xs text-destructive">{fieldErrors.state}</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={fieldErrors.email ? 'border-destructive' : ''}
                  />
                  {fieldErrors.email && (
                    <p className="text-xs text-destructive">{fieldErrors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={fieldErrors.password ? 'border-destructive' : ''}
                  />
                  {fieldErrors.password && (
                    <p className="text-xs text-destructive">{fieldErrors.password}</p>
                  )}
                </div>
              </>
            )}

            {error && <p className="text-sm text-destructive font-medium">{error}</p>}

            <Button type="submit" className="w-full mt-4" disabled={loading}>
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
