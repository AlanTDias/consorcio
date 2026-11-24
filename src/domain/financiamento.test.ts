import { describe, expect, it } from 'vitest'
import { reaisParaCentavos as r } from './dinheiro'
import { jurosAnualEquivalente, simularFinanciamento } from './financiamento'

const p = { valorBem: r(100_000), entrada: 0, jurosMensalPct: 1, prazoMeses: 12 }

describe('financiamento', () => {
  it('Price: R$ 100.000 a 1% a.m. em 12 meses tem parcela de R$ 8.884,88', () => {
    const f = simularFinanciamento(p, 'price')
    expect(f.primeiraParcela).toBe(r(8_884.88))
    expect(f.evolucao[0]?.juros).toBe(r(1_000))
    expect(f.evolucao[0]?.amortizacao).toBe(r(7_884.88))
    expect(f.evolucao.at(-1)?.saldo).toBe(0)
    expect(f.evolucao.reduce((t, l) => t + l.amortizacao, 0)).toBe(r(100_000))
    expect(f.totalJuros).toBe(f.totalParcelas - r(100_000))
  })

  it('SAC: amortização constante, juros totais de R$ 6.500,00', () => {
    const f = simularFinanciamento(p, 'sac')
    expect(f.primeiraParcela).toBe(r(9_333.33))
    expect(f.evolucao[1]?.parcela).toBe(r(9_250))
    expect(f.evolucao.at(-1)?.amortizacao).toBe(r(8_333.37))
    expect(f.ultimaParcela).toBe(r(8_416.7))
    expect(f.totalJuros).toBe(r(6_500))
    expect(f.custoPct).toBe(6.5)
  })

  it('entrada reduz o valor financiado e entra no total pago', () => {
    const f = simularFinanciamento({ ...p, entrada: r(20_000) }, 'sac')
    expect(f.valorFinanciado).toBe(r(80_000))
    expect(f.totalPago).toBe(f.totalParcelas + r(20_000))
  })

  it('juros zero divide o valor igualmente', () => {
    const f = simularFinanciamento({ ...p, jurosMensalPct: 0 }, 'price')
    expect(f.primeiraParcela).toBe(r(8_333.33))
    expect(f.ultimaParcela).toBe(r(8_333.37))
    expect(f.totalJuros).toBe(0)
  })

  it('converte 1% a.m. em 12,68% a.a.', () => {
    expect(jurosAnualEquivalente(1)).toBe(12.68)
  })

  it('recusa entrada maior ou igual ao valor do bem', () => {
    expect(() => simularFinanciamento({ ...p, entrada: r(100_000) }, 'price')).toThrow()
  })
})
