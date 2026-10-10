/**
 * Utilitários para formatação no padrão brasileiro (BRL)
 */

/**
 * Formata um número para a moeda brasileira: R$ 1.234,56
 * Garante separador de milhar com ponto e separador decimal com vírgula.
 */
export function formatCurrencyBRL(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0)
  if (isNaN(num)) return 'R$ 0,00'

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

/**
 * Retorna apenas o valor numérico formatado com vírgula: "1.234,56"
 */
export function formatNumberBRL(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0)
  if (isNaN(num)) return '0,00'

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

/**
 * Calcula o preço total da assinatura conforme a nova regra:
 * Valor base (até 1 usuário) + (usuarios - 1) * valor_por_usuario_extra
 */
export function calculateSubscriptionPrice(
  basePrice: number | null | undefined,
  pricePerUser: number | null | undefined,
  maxUsers: number = 1,
): number {
  const base = Number(basePrice) || 0
  const perUser = Number(pricePerUser) || 0
  const count = Math.max(1, Number(maxUsers) || 1)

  if (count <= 1) return base
  return base + (count - 1) * perUser
}
