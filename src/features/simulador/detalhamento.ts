import type { ParametrosConsorcio, ResultadoConsorcio } from '../../domain/consorcio'
import { formatarMoeda, formatarPct } from '../../domain/dinheiro'

const NOME_LANCE = { livre: 'livre', embutido: 'embutido', fixo: 'fixo' } as const

export function linhasDetalhamento(p: ParametrosConsorcio, r: ResultadoConsorcio) {
  const linhas: [string, string][] = [
    ['Carta de crédito', formatarMoeda(p.carta)],
    [
      `Taxa de administração (${formatarPct(r.taxaAdmTotalPct)} no prazo)`,
      formatarMoeda(r.valorAdm),
    ],
    [`Fundo de reserva (${formatarPct(p.fundoReservaPct)})`, formatarMoeda(r.valorFundoReserva)],
    ['Valor total do plano', formatarMoeda(r.valorPlano)],
  ]
  if (p.seguroMensalPct !== null) {
    linhas.push([
      `Seguro prestamista (${formatarPct(p.seguroMensalPct, 3)} a.m.)`,
      formatarMoeda(r.totalSeguro),
    ])
  }
  if (p.reajusteAnualPct !== null) {
    linhas.push([
      `Reajuste projetado (${formatarPct(p.reajusteAnualPct)} a.a.)`,
      formatarMoeda(r.totalReajuste),
    ])
  }
  if (r.lance) {
    linhas.push([
      `Lance ${NOME_LANCE[r.lance.tipo]} (${formatarPct(r.lance.pct)} da carta)`,
      formatarMoeda(r.lance.valor),
    ])
    if (r.lance.recursoProprio > 0) {
      linhas.push(['Lance pago com recurso próprio', formatarMoeda(r.lance.recursoProprio)])
    }
  }
  return linhas
}
