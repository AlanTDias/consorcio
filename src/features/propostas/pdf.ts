import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import type { Cliente, Config, Proposta } from '../../data/esquemas'
import { ROTULO_STATUS } from '../../data/operacoes'
import type { ResultadoConsorcio } from '../../domain/consorcio'
import { formatarMoeda, formatarPct } from '../../domain/dinheiro'
import { TEXTO_AVISO_LEGAL } from '../../ui/AvisoLegal'
import { formatarData } from '../../ui/dados'
import { linhasDetalhamento } from '../simulador/detalhamento'

const LARANJA: [number, number, number] = [255, 106, 19]
const GRAFITE: [number, number, number] = [28, 31, 36]
const CINZA: [number, number, number] = [90, 96, 104]
const MARGEM = 16

interface DadosPdf {
  proposta: Proposta
  cliente: Cliente | undefined
  vendedor: string
  config: Config
  resultado: ResultadoConsorcio
}

function ultimaPosicao(doc: jsPDF, padrao: number): number {
  return (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? padrao
}

export function nomeArquivoPdf(proposta: Proposta): string {
  return `proposta-${proposta.numero}.pdf`
}

export function gerarPdfProposta({ proposta, cliente, vendedor, config, resultado }: DadosPdf) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const largura = doc.internal.pageSize.getWidth()
  const { empresa } = config
  const categoria = config.categorias.find((c) => c.id === proposta.categoriaId)?.nome ?? ''
  const p = proposta.parametros

  doc.setFillColor(...LARANJA)
  doc.rect(0, 0, largura, 4, 'F')
  doc.setTextColor(...GRAFITE)
  doc.setFont('helvetica', 'bold').setFontSize(18)
  doc.text(empresa.nomeSistema, MARGEM, 18)
  doc
    .setFont('helvetica', 'normal')
    .setFontSize(9)
    .setTextColor(...CINZA)
  doc.text(`${empresa.razaoSocial} - CNPJ ${empresa.cnpj}`, MARGEM, 24)
  doc.text(`Administradora parceira: ${empresa.administradoraParceira}`, MARGEM, 29)

  doc
    .setTextColor(...GRAFITE)
    .setFont('helvetica', 'bold')
    .setFontSize(14)
  doc.text(`Proposta ${proposta.numero}`, MARGEM, 42)
  doc.setFont('helvetica', 'normal').setFontSize(10)
  doc.text(
    `Emitida em ${formatarData(proposta.criadaEm)} - Status: ${ROTULO_STATUS[proposta.status]} - Vendedor: ${vendedor}`,
    MARGEM,
    48,
  )

  const comum = {
    margin: { left: MARGEM, right: MARGEM, bottom: 22 },
    styles: { fontSize: 9, cellPadding: 1.8, textColor: GRAFITE },
    headStyles: { fillColor: GRAFITE, textColor: [255, 255, 255] as [number, number, number] },
    theme: 'grid' as const,
  }

  autoTable(doc, {
    ...comum,
    startY: 54,
    head: [['Cliente', '']],
    body: [
      ['Nome', cliente?.nome ?? '-'],
      ['CPF', cliente?.cpf || '-'],
      ['Telefone', cliente?.telefone || '-'],
      ['E-mail', cliente?.email || '-'],
    ],
    columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' } },
  })

  const resumo: [string, string][] = [
    ['Categoria', categoria],
    ['Carta de crédito', formatarMoeda(p.carta)],
    ['Prazo', `${resultado.prazoEfetivo} meses`],
    ['Parcela inicial', formatarMoeda(resultado.primeiraParcela)],
  ]
  if (resultado.parcelaAposContemplacao !== null) {
    resumo.push([
      `Parcela após o mês ${resultado.mesCredito}`,
      formatarMoeda(resultado.parcelaAposContemplacao),
    ])
  }
  resumo.push(
    ['Última parcela', formatarMoeda(resultado.ultimaParcela)],
    ['Crédito líquido', formatarMoeda(resultado.creditoLiquido)],
    ['Total pago', formatarMoeda(resultado.totalDesembolsado)],
    [
      'Custo total',
      `${formatarMoeda(resultado.custoTotal)} (${formatarPct(resultado.custoPct)} sobre a carta)`,
    ],
  )

  autoTable(doc, {
    ...comum,
    startY: ultimaPosicao(doc, 54) + 6,
    head: [['Simulação', '']],
    body: [...resumo, ...linhasDetalhamento(p, resultado)],
    columnStyles: { 0: { cellWidth: 95 }, 1: { halign: 'right' } },
  })

  let y = ultimaPosicao(doc, 120) + 8
  if (proposta.observacoes) {
    doc.setFont('helvetica', 'bold').setFontSize(10).text('Observações', MARGEM, y)
    doc.setFont('helvetica', 'normal').setFontSize(9)
    const linhas = doc.splitTextToSize(proposta.observacoes, largura - MARGEM * 2)
    doc.text(linhas, MARGEM, y + 5)
    y += 8 + linhas.length * 4
  }

  autoTable(doc, {
    ...comum,
    startY: y,
    head: [['Mês', 'Carta', 'Parcela', 'Seguro', 'Reajuste', 'Lance', 'Saldo devedor']],
    body: resultado.evolucao.map((l) => [
      String(l.mes),
      formatarMoeda(l.carta),
      formatarMoeda(l.parcela),
      l.seguro ? formatarMoeda(l.seguro) : '-',
      l.reajuste ? formatarMoeda(l.reajuste) : '-',
      l.lance ? formatarMoeda(l.lance) : '-',
      formatarMoeda(l.saldoFinal),
    ]),
    styles: { ...comum.styles, fontSize: 8, halign: 'right' },
    columnStyles: { 0: { halign: 'center', cellWidth: 12 } },
  })

  const paginas = doc.getNumberOfPages()
  const altura = doc.internal.pageSize.getHeight()
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i)
    doc
      .setFont('helvetica', 'normal')
      .setFontSize(7.5)
      .setTextColor(...CINZA)
    const aviso = doc.splitTextToSize(TEXTO_AVISO_LEGAL, largura - MARGEM * 2 - 25)
    doc.text(aviso, MARGEM, altura - 14)
    doc.text(`Página ${i} de ${paginas}`, largura - MARGEM, altura - 14, { align: 'right' })
  }

  doc.setProperties({ title: `Proposta ${proposta.numero}`, creator: empresa.nomeSistema })
  return doc
}
