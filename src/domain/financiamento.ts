import { Dec, dividir, emCentavos, razaoPct, type Centavos } from './dinheiro'

export type SistemaAmortizacao = 'price' | 'sac'

export interface ParametrosFinanciamento {
  valorBem: Centavos
  entrada: Centavos
  jurosMensalPct: number
  prazoMeses: number
}

export interface LinhaFinanciamento {
  mes: number
  parcela: Centavos
  juros: Centavos
  amortizacao: Centavos
  saldo: Centavos
}

export interface ResultadoFinanciamento {
  sistema: SistemaAmortizacao
  valorFinanciado: Centavos
  primeiraParcela: Centavos
  ultimaParcela: Centavos
  totalParcelas: Centavos
  totalJuros: Centavos
  totalPago: Centavos
  custoPct: number
  evolucao: LinhaFinanciamento[]
}

export class ErroFinanciamento extends Error {}

export function jurosAnualEquivalente(mensalPct: number): number {
  return new Dec(1)
    .plus(new Dec(mensalPct).div(100))
    .pow(12)
    .minus(1)
    .times(100)
    .toDecimalPlaces(2)
    .toNumber()
}

export function simularFinanciamento(
  p: ParametrosFinanciamento,
  sistema: SistemaAmortizacao,
): ResultadoFinanciamento {
  if (!Number.isInteger(p.valorBem) || p.valorBem <= 0) {
    throw new ErroFinanciamento('Valor do bem inválido.')
  }
  if (!Number.isInteger(p.entrada) || p.entrada < 0 || p.entrada >= p.valorBem) {
    throw new ErroFinanciamento('A entrada deve ser menor que o valor do bem.')
  }
  if (!Number.isInteger(p.prazoMeses) || p.prazoMeses < 1 || p.prazoMeses > 480) {
    throw new ErroFinanciamento('Prazo inválido.')
  }
  if (!Number.isFinite(p.jurosMensalPct) || p.jurosMensalPct < 0 || p.jurosMensalPct > 20) {
    throw new ErroFinanciamento('Taxa de juros inválida.')
  }

  const n = p.prazoMeses
  const i = new Dec(p.jurosMensalPct).div(100)
  const valorFinanciado = p.valorBem - p.entrada
  const parcelaPrice = i.isZero()
    ? dividir(valorFinanciado, n)
    : emCentavos(
        new Dec(valorFinanciado).times(i).div(new Dec(1).minus(new Dec(1).plus(i).pow(-n))),
      )
  const amortizacaoSac = dividir(valorFinanciado, n)

  let saldo = valorFinanciado
  const evolucao: LinhaFinanciamento[] = []
  for (let mes = 1; mes <= n; mes++) {
    const juros = emCentavos(new Dec(saldo).times(i))
    let amortizacao = sistema === 'price' ? parcelaPrice - juros : amortizacaoSac
    if (mes === n || amortizacao > saldo) amortizacao = saldo
    saldo -= amortizacao
    evolucao.push({ mes, parcela: amortizacao + juros, juros, amortizacao, saldo })
    if (saldo === 0) break
  }

  const totalParcelas = evolucao.reduce((t, l) => t + l.parcela, 0)
  const totalJuros = evolucao.reduce((t, l) => t + l.juros, 0)
  return {
    sistema,
    valorFinanciado,
    primeiraParcela: evolucao[0]?.parcela ?? 0,
    ultimaParcela: evolucao[evolucao.length - 1]?.parcela ?? 0,
    totalParcelas,
    totalJuros,
    totalPago: totalParcelas + p.entrada,
    custoPct: razaoPct(totalJuros, p.valorBem),
    evolucao,
  }
}
