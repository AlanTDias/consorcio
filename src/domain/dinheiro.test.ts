import { describe, expect, it } from 'vitest'
import { dividir, formatarMoeda, formatarPct, percentualDe, reaisParaCentavos } from './dinheiro'

describe('dinheiro em centavos', () => {
  it('converte reais sem erro de ponto flutuante', () => {
    expect(reaisParaCentavos(0.1 + 0.2)).toBe(30)
    expect(reaisParaCentavos('1076.665')).toBe(107667)
  })

  it('arredonda meio centavo para cima', () => {
    expect(dividir(2086667, 40)).toBe(52167)
    expect(percentualDe(2000000, '3.333333333')).toBe(66667)
  })

  it('formata no padrão brasileiro', () => {
    expect(formatarMoeda(123456)).toBe('R$ 1.234,56')
    expect(formatarMoeda(35300000)).toBe('R$ 353.000,00')
    expect(formatarPct(16.6667, 2)).toBe('16,67%')
  })
})
