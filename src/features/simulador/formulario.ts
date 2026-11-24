import type { Categoria, Config, FormularioSimulacao } from '../../data/esquemas'
import type { ParametrosConsorcio } from '../../domain/consorcio'
import { reaisParaCentavos } from '../../domain/dinheiro'

export type { FormularioSimulacao }
export type ErrosFormulario = Partial<Record<keyof FormularioSimulacao, string>>

const SUGESTAO: Record<string, { carta: number; prazo: number }> = {
  imovel: { carta: 300_000, prazo: 200 },
  veiculo: { carta: 80_000, prazo: 80 },
  servico: { carta: 20_000, prazo: 40 },
}

const limitar = (valor: number, min: number, max: number) => Math.min(Math.max(valor, min), max)

export function categoriaDe(config: Config, id: string): Categoria {
  const categoria = config.categorias.find((c) => c.id === id) ?? config.categorias[0]
  if (!categoria) throw new Error('Nenhuma categoria configurada')
  return categoria
}

export function valoresDaCategoria(categoria: Categoria) {
  const sugestao = SUGESTAO[categoria.id]
  return {
    carta: limitar(sugestao?.carta ?? categoria.cartaMin, categoria.cartaMin, categoria.cartaMax),
    prazo: limitar(
      sugestao?.prazo ?? categoria.prazoMaxMeses,
      categoria.prazoMinMeses,
      categoria.prazoMaxMeses,
    ),
  }
}

export function formularioPadrao(config: Config): FormularioSimulacao {
  const categoria = categoriaDe(config, 'imovel')
  return {
    categoriaId: categoria.id,
    ...valoresDaCategoria(categoria),
    seguro: false,
    reajuste: false,
    parcelaReduzida: false,
    contemplacao: 'nenhuma',
    mesContemplacao: 12,
    tipoLance: 'embutido',
    pctLance: 25,
    efeitoLance: 'parcela',
    grupoId: '',
  }
}

export function pctLanceEfetivo(f: FormularioSimulacao, categoria: Categoria): number {
  if (f.tipoLance !== 'fixo') return f.pctLance
  return f.grupoId ? f.pctLance : categoria.lanceFixoPct
}

const formatoReais = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

export function validarFormulario(f: FormularioSimulacao, config: Config): ErrosFormulario {
  const erros: ErrosFormulario = {}
  const categoria = categoriaDe(config, f.categoriaId)
  if (!Number.isInteger(f.carta) || f.carta < categoria.cartaMin || f.carta > categoria.cartaMax) {
    erros.carta = `Entre R$ ${formatoReais.format(categoria.cartaMin)} e R$ ${formatoReais.format(categoria.cartaMax)}.`
  }
  if (
    !Number.isInteger(f.prazo) ||
    f.prazo < categoria.prazoMinMeses ||
    f.prazo > categoria.prazoMaxMeses
  ) {
    erros.prazo = `Entre ${categoria.prazoMinMeses} e ${categoria.prazoMaxMeses} meses.`
  }
  const precisaMes = f.contemplacao !== 'nenhuma' || f.parcelaReduzida
  if (precisaMes) {
    const limite = f.contemplacao === 'lance' ? f.prazo - 1 : f.prazo
    if (
      !Number.isInteger(f.mesContemplacao) ||
      f.mesContemplacao < 1 ||
      f.mesContemplacao > limite
    ) {
      erros.mesContemplacao = `Entre 1 e ${Math.max(limite, 1)}.`
    }
  }
  if (f.contemplacao === 'lance') {
    const pct = pctLanceEfetivo(f, categoria)
    const maximo = f.tipoLance === 'embutido' ? config.taxas.lanceEmbutidoMaxPct : 100
    if (!Number.isFinite(pct) || pct <= 0 || pct > maximo) {
      erros.pctLance = `Informe um percentual entre 0,01% e ${String(maximo).replace('.', ',')}%.`
    }
  }
  return erros
}

export function indiceDaCategoria(config: Config, categoria: Categoria) {
  return config.indices.find((i) => i.codigo === categoria.indice) ?? null
}

export function montarParametros(f: FormularioSimulacao, config: Config): ParametrosConsorcio {
  const categoria = categoriaDe(config, f.categoriaId)
  const indice = indiceDaCategoria(config, categoria)
  const usaMes = f.contemplacao !== 'nenhuma' || f.parcelaReduzida
  const mes = f.mesContemplacao
  return {
    carta: reaisParaCentavos(f.carta),
    prazoMeses: f.prazo,
    taxaAdmAnualPct: config.taxas.admAnualPct,
    fundoReservaPct: config.taxas.fundoReservaPct,
    seguroMensalPct: f.seguro ? config.taxas.seguroMensalPct : null,
    reajusteAnualPct: f.reajuste && indice ? indice.anualPct : null,
    parcelaReduzidaPct: f.parcelaReduzida ? config.taxas.parcelaReduzidaPct : null,
    contemplacao: !usaMes
      ? null
      : f.contemplacao === 'lance'
        ? {
            mes,
            tipo: 'lance',
            lance: { tipo: f.tipoLance, pct: pctLanceEfetivo(f, categoria), efeito: f.efeitoLance },
          }
        : { mes, tipo: 'sorteio' },
  }
}
