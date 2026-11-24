import { useMemo, useState } from 'react'
import { Info } from 'lucide-react'
import { useConfig } from '../../contexto'
import type { Config } from '../../data/esquemas'
import { simularConsorcio } from '../../domain/consorcio'
import { formatarMoeda, formatarPct, reaisParaCentavos } from '../../domain/dinheiro'
import { jurosAnualEquivalente, simularFinanciamento } from '../../domain/financiamento'
import { CabecalhoPagina, CampoMoeda, CampoNumero, Segmentado } from '../../ui/campos'
import { categoriaDe, valoresDaCategoria } from '../simulador/formulario'
import './comparador.css'

interface Entradas {
  categoriaId: string
  valor: number
  entrada: number
  prazo: number
  jurosMensal: number
}

type Erros = Partial<Record<keyof Entradas, string>>

function validar(e: Entradas, config: Config): Erros {
  const erros: Erros = {}
  const categoria = categoriaDe(config, e.categoriaId)
  if (e.valor < categoria.cartaMin || e.valor > categoria.cartaMax) {
    erros.valor = `Entre R$ ${categoria.cartaMin.toLocaleString('pt-BR')} e R$ ${categoria.cartaMax.toLocaleString('pt-BR')}.`
  }
  if (e.entrada < 0 || e.entrada >= e.valor) erros.entrada = 'A entrada deve ser menor que o valor.'
  if (
    !Number.isInteger(e.prazo) ||
    e.prazo < categoria.prazoMinMeses ||
    e.prazo > categoria.prazoMaxMeses
  ) {
    erros.prazo = `Entre ${categoria.prazoMinMeses} e ${categoria.prazoMaxMeses} meses.`
  }
  if (!Number.isFinite(e.jurosMensal) || e.jurosMensal < 0 || e.jurosMensal > 20) {
    erros.jurosMensal = 'Informe juros entre 0% e 20% ao mês.'
  }
  return erros
}

export function ComparadorPagina() {
  const { config } = useConfig()
  if (!config) return null
  return <Comparador config={config} />
}

function Comparador({ config }: { config: Config }) {
  const [e, setE] = useState<Entradas>(() => {
    const categoria = categoriaDe(config, 'veiculo')
    const { carta } = valoresDaCategoria(categoria)
    return { categoriaId: categoria.id, valor: carta, entrada: 0, prazo: 60, jurosMensal: 1.5 }
  })
  const alterar = (p: Partial<Entradas>) => setE((atual) => ({ ...atual, ...p }))
  const erros = validar(e, config)
  const valido = Object.keys(erros).length === 0

  const comparacao = useMemo(() => {
    if (!valido) return null
    const valorBem = reaisParaCentavos(e.valor)
    const entrada = reaisParaCentavos(e.entrada)
    const consorcio = simularConsorcio({
      carta: valorBem,
      prazoMeses: e.prazo,
      taxaAdmAnualPct: config.taxas.admAnualPct,
      fundoReservaPct: config.taxas.fundoReservaPct,
      seguroMensalPct: null,
      reajusteAnualPct: null,
      parcelaReduzidaPct: null,
      contemplacao: null,
    })
    const fin = { valorBem, entrada, jurosMensalPct: e.jurosMensal, prazoMeses: e.prazo }
    const price = simularFinanciamento(fin, 'price')
    const sac = simularFinanciamento(fin, 'sac')
    const colunas = [
      {
        nome: 'Consórcio',
        primeira: consorcio.primeiraParcela,
        ultima: consorcio.ultimaParcela,
        totalPago: consorcio.totalDesembolsado,
        custo: consorcio.custoTotal,
        custoPct: consorcio.custoPct,
        nota: 'Taxa de administração + fundo de reserva. Bem recebido só na contemplação.',
      },
      {
        nome: 'Financiamento Price',
        primeira: price.primeiraParcela,
        ultima: price.ultimaParcela,
        totalPago: price.totalPago,
        custo: price.totalJuros,
        custoPct: price.custoPct,
        nota: 'Parcelas iguais. Bem recebido na contratação.',
      },
      {
        nome: 'Financiamento SAC',
        primeira: sac.primeiraParcela,
        ultima: sac.ultimaParcela,
        totalPago: sac.totalPago,
        custo: sac.totalJuros,
        custoPct: sac.custoPct,
        nota: 'Parcelas decrescentes. Bem recebido na contratação.',
      },
    ]
    const menor = Math.min(...colunas.map((c) => c.custo))
    return colunas.map((c) => ({ ...c, menorCusto: c.custo === menor }))
  }, [e, config, valido])

  return (
    <section>
      <CabecalhoPagina
        titulo="Comparador"
        subtitulo="O mesmo valor em consórcio e em financiamento, com os juros que você informar."
      />
      <form className="card pilha-sm" onSubmit={(ev) => ev.preventDefault()} noValidate>
        <Segmentado
          rotulo="Categoria"
          valor={e.categoriaId}
          opcoes={config.categorias.map((c) => ({ valor: c.id, rotulo: c.nome }))}
          aoMudar={(id) => {
            const categoria = categoriaDe(config, id)
            const { carta } = valoresDaCategoria(categoria)
            alterar({
              categoriaId: id,
              valor: carta,
              entrada: 0,
              prazo: Math.min(Math.max(e.prazo, categoria.prazoMinMeses), categoria.prazoMaxMeses),
            })
          }}
        />
        <div className="grade-campos">
          <CampoMoeda
            rotulo="Valor do bem"
            valor={e.valor}
            aoMudar={(valor) => alterar({ valor })}
            erro={erros.valor}
            testId="comp-valor"
          />
          <CampoMoeda
            rotulo="Entrada (financiamento)"
            valor={e.entrada}
            aoMudar={(entrada) => alterar({ entrada })}
            erro={erros.entrada}
          />
          <CampoNumero
            rotulo="Prazo"
            sufixo="meses"
            valor={e.prazo}
            aoMudar={(prazo) => alterar({ prazo })}
            erro={erros.prazo}
            testId="comp-prazo"
          />
          <CampoNumero
            rotulo="Juros do financiamento"
            sufixo="% a.m."
            decimais
            valor={e.jurosMensal}
            aoMudar={(jurosMensal) => alterar({ jurosMensal })}
            erro={erros.jurosMensal}
            ajuda={
              Number.isFinite(e.jurosMensal) && e.jurosMensal >= 0
                ? `Equivale a ${formatarPct(jurosAnualEquivalente(e.jurosMensal))} ao ano`
                : undefined
            }
            testId="comp-juros"
          />
        </div>
      </form>

      {comparacao ? (
        <div className="comparacao" aria-live="polite">
          {comparacao.map((c) => (
            <article key={c.nome} className="card comparacao-coluna" data-menor={c.menorCusto}>
              <header>
                <h2>{c.nome}</h2>
                {c.menorCusto && <span className="etiqueta etiqueta-ativa">Menor custo</span>}
              </header>
              <dl className="lista-detalhe">
                <div>
                  <dt>1ª parcela</dt>
                  <dd>{formatarMoeda(c.primeira)}</dd>
                </div>
                <div>
                  <dt>Última parcela</dt>
                  <dd>{formatarMoeda(c.ultima)}</dd>
                </div>
                <div>
                  <dt>Total pago</dt>
                  <dd>{formatarMoeda(c.totalPago)}</dd>
                </div>
                <div>
                  <dt>Custo total</dt>
                  <dd data-testid={`custo-${c.nome}`}>{formatarMoeda(c.custo)}</dd>
                </div>
                <div>
                  <dt>Custo sobre o valor</dt>
                  <dd>{formatarPct(c.custoPct)}</dd>
                </div>
              </dl>
              <p className="texto-secundario nota-coluna">{c.nota}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="texto-secundario comparacao">Corrija os campos destacados para comparar.</p>
      )}
      <p className="alerta alerta-aviso comparacao-aviso">
        <Info size={18} aria-hidden="true" />
        <span>
          Comparação sem seguros, tarifas, IOF nem reajustes. No consórcio não há juros, mas o bem
          só é liberado na contemplação; no financiamento ele é liberado na contratação.
        </span>
      </p>
    </section>
  )
}
