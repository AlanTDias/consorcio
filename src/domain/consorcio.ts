import { Dec, dividir, emCentavos, percentualDe, razaoPct, type Centavos } from './dinheiro'

export type TipoLance = 'livre' | 'embutido' | 'fixo'
export type EfeitoLance = 'parcela' | 'prazo'

export interface Lance {
  tipo: TipoLance
  pct: number
  efeito: EfeitoLance
}

export type Contemplacao =
  { mes: number; tipo: 'sorteio' } | { mes: number; tipo: 'lance'; lance: Lance }

export interface ParametrosConsorcio {
  carta: Centavos
  prazoMeses: number
  taxaAdmAnualPct: number
  fundoReservaPct: number
  seguroMensalPct: number | null
  reajusteAnualPct: number | null
  parcelaReduzidaPct: number | null
  contemplacao: Contemplacao | null
}

export interface LinhaEvolucao {
  mes: number
  carta: Centavos
  reajuste: Centavos
  saldoInicial: Centavos
  parcelaBase: Centavos
  seguro: Centavos
  parcela: Centavos
  lance: Centavos
  saldoFinal: Centavos
  eventos: string[]
}

export interface ResultadoLance {
  tipo: TipoLance
  pct: number
  valor: Centavos
  embutido: Centavos
  recursoProprio: Centavos
}

export interface ResultadoConsorcio {
  taxaAdmTotalPct: number
  valorAdm: Centavos
  valorFundoReserva: Centavos
  valorPlano: Centavos
  parcelaInicial: Centavos
  primeiraParcela: Centavos
  ultimaParcela: Centavos
  parcelaMedia: Centavos
  parcelaAposContemplacao: Centavos | null
  totalParcelas: Centavos
  totalSeguro: Centavos
  totalReajuste: Centavos
  totalDesembolsado: Centavos
  lance: ResultadoLance | null
  mesCredito: number
  cartaNoCredito: Centavos
  creditoLiquido: Centavos
  custoTotal: Centavos
  custoPct: number
  prazoEfetivo: number
  evolucao: LinhaEvolucao[]
}

export class ErroSimulacao extends Error {}

function validar(p: ParametrosConsorcio): void {
  const inteiroPositivo = (v: number) => Number.isInteger(v) && v > 0
  if (!inteiroPositivo(p.carta)) throw new ErroSimulacao('Carta de crédito inválida.')
  if (!inteiroPositivo(p.prazoMeses) || p.prazoMeses > 420) {
    throw new ErroSimulacao('Prazo inválido.')
  }
  const pcts = [p.taxaAdmAnualPct, p.fundoReservaPct, p.seguroMensalPct ?? 0]
  if (pcts.some((v) => !Number.isFinite(v) || v < 0 || v > 100)) {
    throw new ErroSimulacao('Percentual inválido.')
  }
  if (
    p.reajusteAnualPct !== null &&
    (!Number.isFinite(p.reajusteAnualPct) || p.reajusteAnualPct <= -100)
  ) {
    throw new ErroSimulacao('Índice de reajuste inválido.')
  }
  if (p.parcelaReduzidaPct !== null) {
    if (!(p.parcelaReduzidaPct > 0 && p.parcelaReduzidaPct <= 100)) {
      throw new ErroSimulacao('Percentual da parcela reduzida inválido.')
    }
    if (!p.contemplacao) {
      throw new ErroSimulacao('A parcela reduzida exige um mês hipotético de contemplação.')
    }
  }
  const c = p.contemplacao
  if (c) {
    if (!Number.isInteger(c.mes) || c.mes < 1 || c.mes > p.prazoMeses) {
      throw new ErroSimulacao('Mês de contemplação fora do prazo.')
    }
    if (c.tipo === 'lance') {
      if (c.mes >= p.prazoMeses) {
        throw new ErroSimulacao('O lance precisa ser antes da última parcela.')
      }
      if (!(c.lance.pct > 0 && c.lance.pct <= 100)) {
        throw new ErroSimulacao('Percentual do lance inválido.')
      }
    }
  }
}

export function simularConsorcio(p: ParametrosConsorcio): ResultadoConsorcio {
  validar(p)
  const n = p.prazoMeses
  const taxaAdmTotal = new Dec(p.taxaAdmAnualPct).times(n).div(12)
  const valorAdm = percentualDe(p.carta, taxaAdmTotal)
  const valorFundoReserva = percentualDe(p.carta, p.fundoReservaPct)
  const valorPlano = p.carta + valorAdm + valorFundoReserva
  const parcelaCheia = dividir(valorPlano, n)
  const contemplacao = p.contemplacao
  const reduzida = p.parcelaReduzidaPct !== null && contemplacao !== null

  let carta = p.carta
  let saldo = valorPlano
  let mesesTotais = n
  let parcelaAtual = reduzida
    ? percentualDe(parcelaCheia, p.parcelaReduzidaPct ?? 100)
    : parcelaCheia
  let emPeriodoReduzido = reduzida
  let lance: ResultadoLance | null = null
  let cartaNoCredito: Centavos | null = null
  let parcelaAposContemplacao: Centavos | null = null
  const evolucao: LinhaEvolucao[] = []

  for (let mes = 1; mes <= mesesTotais && saldo > 0; mes++) {
    const eventos: string[] = []
    let reajuste = 0

    if (p.reajusteAnualPct !== null && mes > 1 && (mes - 1) % 12 === 0) {
      const fator = new Dec(1).plus(new Dec(p.reajusteAnualPct).div(100))
      const novoSaldo = emCentavos(new Dec(saldo).times(fator))
      carta = emCentavos(new Dec(carta).times(fator))
      reajuste = novoSaldo - saldo
      saldo = novoSaldo
      parcelaAtual = emPeriodoReduzido
        ? emCentavos(new Dec(parcelaAtual).times(fator))
        : dividir(saldo, mesesTotais - mes + 1)
      eventos.push(`Reajuste anual de ${p.reajusteAnualPct}%`)
    }

    const saldoInicial = saldo
    const ultima = mes === mesesTotais
    const parcelaBase = ultima ? saldo : Math.min(parcelaAtual, saldo)
    const seguro = p.seguroMensalPct ? percentualDe(saldo, p.seguroMensalPct) : 0
    saldo -= parcelaBase
    let valorLance = 0

    if (contemplacao && mes === contemplacao.mes) {
      cartaNoCredito = carta
      const restantes = mesesTotais - mes
      const saldoAntesDoLance = saldo
      if (contemplacao.tipo === 'lance') {
        const { tipo, pct, efeito } = contemplacao.lance
        valorLance = Math.min(percentualDe(carta, pct), saldo)
        saldo -= valorLance
        lance = {
          tipo,
          pct,
          valor: valorLance,
          embutido: tipo === 'embutido' ? valorLance : 0,
          recursoProprio: tipo === 'embutido' ? 0 : valorLance,
        }
        eventos.push(`Contemplação por lance ${tipo} de ${pct}%`)
        if (restantes > 0 && saldo > 0) {
          if (efeito === 'parcela') {
            parcelaAtual = dividir(saldo, restantes)
          } else {
            parcelaAtual = dividir(saldoAntesDoLance, restantes)
            mesesTotais = mes + Math.ceil(saldo / parcelaAtual)
          }
        }
      } else {
        eventos.push('Contemplação por sorteio')
        if (emPeriodoReduzido && restantes > 0) parcelaAtual = dividir(saldo, restantes)
      }
      emPeriodoReduzido = false
      parcelaAposContemplacao = saldo > 0 ? parcelaAtual : null
    }

    evolucao.push({
      mes,
      carta,
      reajuste,
      saldoInicial,
      parcelaBase,
      seguro,
      parcela: parcelaBase + seguro,
      lance: valorLance,
      saldoFinal: saldo,
      eventos,
    })
  }

  const soma = (f: (l: LinhaEvolucao) => number) => evolucao.reduce((t, l) => t + f(l), 0)
  const totalParcelas = soma((l) => l.parcelaBase)
  const totalSeguro = soma((l) => l.seguro)
  const totalReajuste = soma((l) => l.reajuste)
  const recursoProprio = lance?.recursoProprio ?? 0
  const totalDesembolsado = totalParcelas + totalSeguro + recursoProprio
  const cartaCredito = cartaNoCredito ?? carta
  const creditoLiquido = cartaCredito - (lance?.embutido ?? 0)
  const custoTotal = valorAdm + valorFundoReserva + totalSeguro
  const primeira = evolucao[0]
  const ultimaLinha = evolucao[evolucao.length - 1]

  return {
    taxaAdmTotalPct: taxaAdmTotal.toDecimalPlaces(4).toNumber(),
    valorAdm,
    valorFundoReserva,
    valorPlano,
    parcelaInicial: primeira?.parcelaBase ?? 0,
    primeiraParcela: primeira?.parcela ?? 0,
    ultimaParcela: ultimaLinha?.parcela ?? 0,
    parcelaMedia: dividir(totalParcelas + totalSeguro, Math.max(evolucao.length, 1)),
    parcelaAposContemplacao,
    totalParcelas,
    totalSeguro,
    totalReajuste,
    totalDesembolsado,
    lance,
    mesCredito: contemplacao?.mes ?? evolucao.length,
    cartaNoCredito: cartaCredito,
    creditoLiquido,
    custoTotal,
    custoPct: razaoPct(custoTotal, p.carta),
    prazoEfetivo: evolucao.length,
    evolucao,
  }
}
