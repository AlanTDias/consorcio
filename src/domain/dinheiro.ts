import Decimal from 'decimal.js'

export const Dec = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP })
export type Dec = InstanceType<typeof Dec>

export type Centavos = number

export function emCentavos(valor: Decimal.Value): Centavos {
  return new Dec(valor).toDecimalPlaces(0, Dec.ROUND_HALF_UP).toNumber()
}

export function reaisParaCentavos(reais: Decimal.Value): Centavos {
  return emCentavos(new Dec(reais).times(100))
}

export function percentualDe(base: Centavos, pct: Decimal.Value): Centavos {
  return emCentavos(new Dec(base).times(pct).div(100))
}

export function dividir(valor: Centavos, divisor: Decimal.Value): Centavos {
  return emCentavos(new Dec(valor).div(divisor))
}

export function razaoPct(parte: Centavos, todo: Centavos, casas = 2): number {
  if (todo === 0) return 0
  return new Dec(parte).div(todo).times(100).toDecimalPlaces(casas, Dec.ROUND_HALF_UP).toNumber()
}

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const numero = (casas: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

export function formatarMoeda(valor: Centavos): string {
  return moeda.format(new Dec(valor).div(100).toNumber()).replace(/\u00a0/g, ' ')
}

export function formatarPct(valor: number, casas = 2): string {
  return `${numero(casas).format(valor)}%`
}

export function formatarNumero(valor: number, casas = 0): string {
  return numero(casas).format(valor)
}
