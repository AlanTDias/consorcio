import type { Sessao } from '../../auth/AuthService'
import type { Config, Proposta, Usuario } from '../../data/esquemas'
import { visiveis } from '../../data/operacoes'
import { dividir, razaoPct, type Centavos } from '../../domain/dinheiro'

export interface Periodo {
  inicio: Date
  fim: Date
}

export function periodoDoMes(referencia: Date, deslocamento = 0): Periodo {
  const inicio = new Date(referencia.getFullYear(), referencia.getMonth() + deslocamento, 1)
  const fim = new Date(referencia.getFullYear(), referencia.getMonth() + deslocamento + 1, 1)
  return { inicio, fim }
}

function dentro(iso: string | null, periodo: Periodo): boolean {
  if (!iso) return false
  const t = new Date(iso).getTime()
  return t >= periodo.inicio.getTime() && t < periodo.fim.getTime()
}

export interface LinhaVendedor {
  vendedorId: string
  nome: string
  cotas: number
  volume: Centavos
}

export interface LinhaMeta extends LinhaVendedor {
  meta: Centavos
  pct: number
}

export interface Indicadores {
  vendas: number
  volume: Centavos
  ticketMedio: Centavos
  emAberto: number
  volumeEmAberto: Centavos
  porCategoria: { categoriaId: string; nome: string; cotas: number; volume: Centavos }[]
  ranking: LinhaVendedor[]
  metas: LinhaMeta[]
}

export function calcularIndicadores(entrada: {
  sessao: Sessao
  propostas: Proposta[]
  usuarios: Usuario[]
  config: Config
  periodo: Periodo
}): Indicadores {
  const { sessao, propostas, usuarios, config, periodo } = entrada
  const vendasEquipe = propostas.filter(
    (p) => p.status === 'aceita' && dentro(p.fechadaEm, periodo),
  )
  const minhas = visiveis(sessao, propostas)
  const vendas = visiveis(sessao, vendasEquipe)
  const abertas = minhas.filter((p) => p.status === 'aberta' || p.status === 'enviada')
  const volume = vendas.reduce((t, p) => t + p.parametros.carta, 0)

  const vendedores = usuarios.filter((u) => u.perfil === 'Vendedor')
  const linhaDe = (u: Usuario): LinhaVendedor => {
    const dele = vendasEquipe.filter((p) => p.vendedorId === u.id)
    return {
      vendedorId: u.id,
      nome: u.nome,
      cotas: dele.length,
      volume: dele.reduce((t, p) => t + p.parametros.carta, 0),
    }
  }

  const ranking = vendedores
    .map(linhaDe)
    .sort((a, b) => b.volume - a.volume || a.nome.localeCompare(b.nome))

  const metas = ranking
    .filter((l) => sessao.perfil !== 'Vendedor' || l.vendedorId === sessao.usuarioId)
    .map((l) => {
      const meta = (config.metas.find((m) => m.vendedorId === l.vendedorId)?.mensal ?? 0) * 100
      return { ...l, meta, pct: razaoPct(l.volume, meta, 1) }
    })

  return {
    vendas: vendas.length,
    volume,
    ticketMedio: vendas.length ? dividir(volume, vendas.length) : 0,
    emAberto: abertas.length,
    volumeEmAberto: abertas.reduce((t, p) => t + p.parametros.carta, 0),
    porCategoria: config.categorias.map((c) => {
      const daCategoria = vendas.filter((p) => p.categoriaId === c.id)
      return {
        categoriaId: c.id,
        nome: c.nome,
        cotas: daCategoria.length,
        volume: daCategoria.reduce((t, p) => t + p.parametros.carta, 0),
      }
    }),
    ranking,
    metas,
  }
}
