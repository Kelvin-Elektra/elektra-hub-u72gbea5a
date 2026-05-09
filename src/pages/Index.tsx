import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  DollarSign,
  Users,
  AlertCircle,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react'
import { mockMetrics, mockGrowthData, mockModuleDist, mockActivity } from '@/lib/data'

const growthConfig = {
  revenue: { label: 'MRR (R$)', color: 'hsl(var(--chart-1))' },
} satisfies ChartConfig

const pieConfig = {
  value: { label: 'Empresas' },
} satisfies ChartConfig

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

export default function Index() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Painel de Controle</h1>
        <p className="text-muted-foreground">
          Visão geral do ecossistema Master Hub e integrações.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(mockMetrics.mrr)}</div>
            <p className="text-xs text-muted-foreground mt-1">+12.4% em relação ao mês anterior</p>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinaturas Ativas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockMetrics.activeSubs}</div>
            <p className="text-xs text-muted-foreground mt-1">+22 novas empresas este mês</p>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagamentos Pendentes</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{mockMetrics.pendingPayments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Acionamentos de bloqueio programados
            </p>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: '0.25s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Churn</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{mockMetrics.churnRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              -0.3% em relação aos últimos 30 dias
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <CardHeader>
            <CardTitle>Crescimento (Últimos 6 Meses)</CardTitle>
            <CardDescription>Evolução da Receita Recorrente Mensal (MRR)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={growthConfig} className="h-[300px] w-full">
              <AreaChart data={mockGrowthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-revenue)"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#fillRevenue)"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 animate-slide-up" style={{ animationDelay: '0.35s' }}>
          <CardHeader>
            <CardTitle>Adesão de Módulos</CardTitle>
            <CardDescription>Distribuição de clientes por módulo ativado</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <ChartContainer config={pieConfig} className="h-[220px] w-full">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={mockModuleDist}
                  dataKey="value"
                  nameKey="module"
                  innerRadius={60}
                  strokeWidth={4}
                  paddingAngle={2}
                >
                  {mockModuleDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
              {mockModuleDist.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="text-muted-foreground">
                    {item.module} ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
        <CardHeader>
          <CardTitle>Feed de Atividades</CardTitle>
          <CardDescription>Principais eventos do ecossistema nas últimas 24 horas.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {mockActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4">
                <div className="mt-0.5 shrink-0">
                  {activity.type === 'success' && (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  )}
                  {activity.type === 'warning' && (
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                  )}
                  {activity.type === 'error' && <XCircle className="h-5 w-5 text-destructive" />}
                  {activity.type === 'info' && <Info className="h-5 w-5 text-blue-500" />}
                </div>
                <div className="grid gap-1">
                  <p className="text-sm font-medium leading-none">{activity.title}</p>
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                </div>
                <div className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
                  {activity.time}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
