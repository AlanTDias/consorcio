import type { ParametrosConsorcio, ResultadoConsorcio } from '../../domain/consorcio'
import { formatarMoeda, formatarPct } from '../../domain/dinheiro'
import { linhasDetalhamento } from './detalhamento'

export function ResultadoSimulacao({
  parametros,
  resultado,
}: {
  parametros: ParametrosConsorcio
  resultado: ResultadoConsorcio
}) {
  const reduzida = parametros.parcelaReduzidaPct !== null
  return (
    <div className="pilha-sm" data-testid="resultado-simulacao">
      <div className="destaque-parcela">
        <span className="indicador-rotulo">
          {reduzida
            ? `Parcela reduzida (${formatarPct(parametros.parcelaReduzidaPct ?? 0, 0)}) até a contemplação`
            : 'Parcela inicial'}
        </span>
        <strong data-testid="parcela-inicial">{formatarMoeda(resultado.primeiraParcela)}</strong>
        {parametros.seguroMensalPct !== null && (
          <span className="indicador-nota">
            inclui {formatarMoeda(resultado.evolucao[0]?.seguro ?? 0)} de seguro
          </span>
        )}
      </div>

      <div className="indicadores">
        {resultado.parcelaAposContemplacao !== null && (
          <Indicador
            rotulo={`Parcela após o mês ${resultado.mesCredito}`}
            valor={formatarMoeda(resultado.parcelaAposContemplacao)}
            nota="sem seguro"
          />
        )}
        <Indicador
          rotulo="Crédito líquido"
          valor={formatarMoeda(resultado.creditoLiquido)}
          nota={`no mês ${resultado.mesCredito}${parametros.reajusteAnualPct !== null ? ', corrigido' : ''}`}
          testId="credito-liquido"
        />
        <Indicador
          rotulo="Total pago"
          valor={formatarMoeda(resultado.totalDesembolsado)}
          testId="total-pago"
        />
        <Indicador
          rotulo="Custo total (taxas e seguro)"
          valor={formatarMoeda(resultado.custoTotal)}
          nota={`${formatarPct(resultado.custoPct)} sobre a carta`}
          testId="custo-total"
        />
        <Indicador
          rotulo="Prazo"
          valor={`${resultado.prazoEfetivo} meses`}
          nota={
            resultado.prazoEfetivo !== parametros.prazoMeses
              ? `contratado: ${parametros.prazoMeses}`
              : undefined
          }
        />
        <Indicador rotulo="Última parcela" valor={formatarMoeda(resultado.ultimaParcela)} />
      </div>

      <dl className="lista-detalhe" aria-label="Detalhamento">
        {linhasDetalhamento(parametros, resultado).map(([rotulo, valor]) => (
          <div key={rotulo}>
            <dt>{rotulo}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function Indicador({
  rotulo,
  valor,
  nota,
  testId,
}: {
  rotulo: string
  valor: string
  nota?: string | undefined
  testId?: string
}) {
  return (
    <div className="indicador">
      <span className="indicador-rotulo">{rotulo}</span>
      <span className="indicador-valor" data-testid={testId}>
        {valor}
      </span>
      {nota && <span className="indicador-nota">{nota}</span>}
    </div>
  )
}

export function TabelaEvolucao({ resultado }: { resultado: ResultadoConsorcio }) {
  return (
    <div className="tabela-rolagem tabela-evolucao" tabIndex={0} aria-label="Evolução mês a mês">
      <table className="tabela">
        <thead>
          <tr>
            <th scope="col" className="num">
              Mês
            </th>
            <th scope="col" className="num">
              Carta
            </th>
            <th scope="col" className="num">
              Reajuste
            </th>
            <th scope="col" className="num">
              Parcela
            </th>
            <th scope="col" className="num">
              Seguro
            </th>
            <th scope="col" className="num">
              Lance
            </th>
            <th scope="col" className="num">
              Saldo devedor
            </th>
            <th scope="col">Evento</th>
          </tr>
        </thead>
        <tbody>
          {resultado.evolucao.map((l) => (
            <tr key={l.mes} data-destaque={l.eventos.length > 0}>
              <td className="num">{l.mes}</td>
              <td className="num">{formatarMoeda(l.carta)}</td>
              <td className="num">{l.reajuste ? formatarMoeda(l.reajuste) : '—'}</td>
              <td className="num">{formatarMoeda(l.parcela)}</td>
              <td className="num">{l.seguro ? formatarMoeda(l.seguro) : '—'}</td>
              <td className="num">{l.lance ? formatarMoeda(l.lance) : '—'}</td>
              <td className="num">{formatarMoeda(l.saldoFinal)}</td>
              <td>{l.eventos.join(' · ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
