import { describe, expect, it } from 'vitest'
import { ErroSimulacao, simularConsorcio, type ParametrosConsorcio } from './consorcio'
import { reaisParaCentavos as r } from './dinheiro'

const base = (carta: number, prazoMeses: number): ParametrosConsorcio => ({
  carta: r(carta),
  prazoMeses,
  taxaAdmAnualPct: 1,
  fundoReservaPct: 1,
  seguroMensalPct: null,
  reajusteAnualPct: null,
  parcelaReduzidaPct: null,
  contemplacao: null,
})

describe('consórcio: casos de referência calculados à mão', () => {
  it('Imóvel: carta R$ 300.000, 200 meses', () => {
    const s = simularConsorcio(base(300_000, 200))
    expect(s.taxaAdmTotalPct).toBe(16.6667)
    expect(s.valorAdm).toBe(r(50_000))
    expect(s.valorFundoReserva).toBe(r(3_000))
    expect(s.valorPlano).toBe(r(353_000))
    expect(s.primeiraParcela).toBe(r(1_765))
    expect(s.ultimaParcela).toBe(r(1_765))
    expect(s.totalDesembolsado).toBe(r(353_000))
    expect(s.custoTotal).toBe(r(53_000))
    expect(s.custoPct).toBe(17.67)
    expect(s.prazoEfetivo).toBe(200)
  })

  it('Veículo: carta R$ 80.000, 80 meses (última parcela absorve os centavos)', () => {
    const s = simularConsorcio(base(80_000, 80))
    expect(s.valorAdm).toBe(r(5_333.33))
    expect(s.valorFundoReserva).toBe(r(800))
    expect(s.valorPlano).toBe(r(86_133.33))
    expect(s.primeiraParcela).toBe(r(1_076.67))
    expect(s.evolucao[78]?.parcela).toBe(r(1_076.67))
    expect(s.ultimaParcela).toBe(r(1_076.4))
    expect(s.totalParcelas).toBe(r(86_133.33))
  })

  it('Serviço: carta R$ 20.000, 40 meses, última parcela R$ 521,54', () => {
    const s = simularConsorcio(base(20_000, 40))
    expect(s.valorAdm).toBe(r(666.67))
    expect(s.valorFundoReserva).toBe(r(200))
    expect(s.valorPlano).toBe(r(20_866.67))
    expect(s.primeiraParcela).toBe(r(521.67))
    expect(s.ultimaParcela).toBe(r(521.54))
    expect(s.totalParcelas).toBe(r(20_866.67))
    expect(s.custoTotal).toBe(r(866.67))
  })

  it('Imóvel com lance embutido de 25% no mês 12, reduzindo a parcela', () => {
    const s = simularConsorcio({
      ...base(300_000, 200),
      contemplacao: {
        mes: 12,
        tipo: 'lance',
        lance: { tipo: 'embutido', pct: 25, efeito: 'parcela' },
      },
    })
    expect(s.lance).toEqual({
      tipo: 'embutido',
      pct: 25,
      valor: r(75_000),
      embutido: r(75_000),
      recursoProprio: 0,
    })
    expect(s.creditoLiquido).toBe(r(225_000))
    expect(s.evolucao[11]?.saldoFinal).toBe(r(256_820))
    expect(s.parcelaAposContemplacao).toBe(r(1_366.06))
    expect(s.ultimaParcela).toBe(r(1_366.78))
    expect(s.prazoEfetivo).toBe(200)
    expect(s.totalParcelas).toBe(r(278_000))
    expect(s.custoTotal).toBe(r(53_000))
  })

  it('Imóvel com lance embutido de 25% no mês 12, reduzindo o prazo', () => {
    const s = simularConsorcio({
      ...base(300_000, 200),
      contemplacao: {
        mes: 12,
        tipo: 'lance',
        lance: { tipo: 'embutido', pct: 25, efeito: 'prazo' },
      },
    })
    expect(s.creditoLiquido).toBe(r(225_000))
    expect(s.parcelaAposContemplacao).toBe(r(1_765))
    expect(s.prazoEfetivo).toBe(158)
    expect(s.ultimaParcela).toBe(r(895))
    expect(s.totalParcelas).toBe(r(278_000))
  })
})

describe('consórcio: demais regras', () => {
  it('lance livre é pago com recurso próprio e não reduz o crédito', () => {
    const s = simularConsorcio({
      ...base(80_000, 80),
      contemplacao: { mes: 6, tipo: 'lance', lance: { tipo: 'livre', pct: 40, efeito: 'parcela' } },
    })
    expect(s.lance?.valor).toBe(r(32_000))
    expect(s.lance?.recursoProprio).toBe(r(32_000))
    expect(s.creditoLiquido).toBe(r(80_000))
    expect(s.totalDesembolsado).toBe(r(86_133.33))
    expect(s.custoTotal).toBe(r(6_133.33))
  })

  it('lance fixo também abate o saldo devedor', () => {
    const s = simularConsorcio({
      ...base(20_000, 40),
      contemplacao: { mes: 1, tipo: 'lance', lance: { tipo: 'fixo', pct: 30, efeito: 'parcela' } },
    })
    expect(s.evolucao[0]?.saldoFinal).toBe(r(20_866.67 - 521.67 - 6_000))
    expect(s.lance?.recursoProprio).toBe(r(6_000))
  })

  it('seguro prestamista incide sobre o saldo devedor e diminui mês a mês', () => {
    const s = simularConsorcio({ ...base(20_000, 40), seguroMensalPct: 0.04 })
    expect(s.evolucao[0]?.seguro).toBe(r(8.35))
    expect(s.primeiraParcela).toBe(r(530.02))
    expect(s.evolucao[1]?.seguro).toBe(r(8.14))
    expect(s.totalParcelas).toBe(r(20_866.67))
    expect(s.custoTotal).toBe(r(866.67) + s.totalSeguro)
  })

  it('parcela reduzida de 70% até a contemplação, diferença redistribuída depois', () => {
    const s = simularConsorcio({
      ...base(20_000, 40),
      parcelaReduzidaPct: 70,
      contemplacao: { mes: 10, tipo: 'sorteio' },
    })
    expect(s.primeiraParcela).toBe(r(365.17))
    expect(s.evolucao[9]?.saldoFinal).toBe(r(17_214.97))
    expect(s.parcelaAposContemplacao).toBe(r(573.83))
    expect(s.ultimaParcela).toBe(r(573.9))
    expect(s.totalParcelas).toBe(r(20_866.67))
  })

  it('reajuste anual corrige carta e saldo no mês 13 e recalcula a parcela', () => {
    const s = simularConsorcio({ ...base(80_000, 80), reajusteAnualPct: 4.5 })
    const mes13 = s.evolucao[12]
    expect(mes13?.carta).toBe(r(83_600))
    expect(mes13?.saldoInicial).toBe(r(76_507.89))
    expect(mes13?.reajuste).toBe(r(3_294.6))
    expect(mes13?.parcelaBase).toBe(r(1_125.12))
    expect(s.evolucao[11]?.parcelaBase).toBe(r(1_076.67))
    expect(s.evolucao.at(-1)?.saldoFinal).toBe(0)
  })

  it('com reajuste, o custo continua sendo taxas + seguro e nunca fica negativo', () => {
    const s = simularConsorcio({
      ...base(520_000, 240),
      seguroMensalPct: 0.04,
      reajusteAnualPct: 5.5,
    })
    expect(s.totalReajuste).toBeGreaterThan(0)
    expect(s.custoTotal).toBe(r(104_000) + r(5_200) + s.totalSeguro)
    expect(s.custoPct).toBeGreaterThan(0)
  })

  it('custo percentual é sobre a carta contratada, mesmo com lance embutido', () => {
    const s = simularConsorcio({
      ...base(300_000, 200),
      contemplacao: {
        mes: 12,
        tipo: 'lance',
        lance: { tipo: 'embutido', pct: 25, efeito: 'parcela' },
      },
    })
    expect(s.custoPct).toBe(17.67)
  })

  it('contemplação por sorteio fixa o crédito na carta vigente no mês', () => {
    const s = simularConsorcio({
      ...base(80_000, 80),
      reajusteAnualPct: 4.5,
      contemplacao: { mes: 20, tipo: 'sorteio' },
    })
    expect(s.mesCredito).toBe(20)
    expect(s.creditoLiquido).toBe(r(83_600))
  })

  it('o saldo sempre termina zerado e nunca fica negativo', () => {
    const s = simularConsorcio({
      ...base(150_000, 120),
      seguroMensalPct: 0.04,
      reajusteAnualPct: 5.5,
      parcelaReduzidaPct: 70,
      contemplacao: { mes: 37, tipo: 'lance', lance: { tipo: 'livre', pct: 35, efeito: 'prazo' } },
    })
    expect(s.evolucao.every((l) => l.saldoFinal >= 0 && l.parcelaBase >= 0)).toBe(true)
    expect(s.evolucao.at(-1)?.saldoFinal).toBe(0)
    expect(s.prazoEfetivo).toBeLessThan(120)
  })

  it('lance maior que o saldo é limitado ao saldo', () => {
    const s = simularConsorcio({
      ...base(20_000, 40),
      contemplacao: {
        mes: 39,
        tipo: 'lance',
        lance: { tipo: 'livre', pct: 100, efeito: 'parcela' },
      },
    })
    const mes39 = s.evolucao[38]
    if (!mes39) throw new Error('mês 39 ausente')
    expect(s.lance?.valor).toBe(mes39.saldoInicial - mes39.parcelaBase)
    expect(s.creditoLiquido).toBe(r(20_000))
    expect(s.prazoEfetivo).toBe(39)
  })

  it('recusa parâmetros inválidos', () => {
    expect(() => simularConsorcio({ ...base(20_000, 0) })).toThrow(ErroSimulacao)
    expect(() => simularConsorcio({ ...base(20_000, 40), parcelaReduzidaPct: 70 })).toThrow(
      'mês hipotético',
    )
    expect(() =>
      simularConsorcio({ ...base(20_000, 40), contemplacao: { mes: 41, tipo: 'sorteio' } }),
    ).toThrow('fora do prazo')
    expect(() =>
      simularConsorcio({
        ...base(20_000, 40),
        contemplacao: {
          mes: 40,
          tipo: 'lance',
          lance: { tipo: 'livre', pct: 10, efeito: 'parcela' },
        },
      }),
    ).toThrow('antes da última')
  })
})
