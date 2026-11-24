import type { Grupo, Proposta, StatusGrupo } from './esquemas'
import { ErroOperacao, novoId } from './operacoes'
import type { Repositorios } from './repositorios'

export const ROTULO_STATUS_GRUPO: Record<StatusGrupo, string> = {
  formacao: 'Em formação',
  andamento: 'Em andamento',
  encerrado: 'Encerrado',
}

export interface Ocupacao {
  ocupadas: number
  vendidasPeloSistema: number
  disponiveis: number
  pct: number
}

export function ocupacao(grupo: Grupo, propostas: Proposta[]): Ocupacao {
  const vendidasPeloSistema = propostas.filter(
    (p) => p.grupoId === grupo.id && p.status === 'aceita',
  ).length
  const ocupadas = Math.min(grupo.cotasOcupadasIniciais + vendidasPeloSistema, grupo.participantes)
  return {
    ocupadas,
    vendidasPeloSistema,
    disponiveis: grupo.participantes - ocupadas,
    pct: Math.round((ocupadas / grupo.participantes) * 1000) / 10,
  }
}

export function gruposComVaga(grupos: Grupo[], propostas: Proposta[], categoriaId: string) {
  return grupos.filter(
    (g) =>
      g.categoriaId === categoriaId &&
      g.status !== 'encerrado' &&
      ocupacao(g, propostas).disponiveis > 0,
  )
}

export interface DadosGrupo {
  codigo: string
  categoriaId: string
  prazoMeses: number
  participantes: number
  cotasOcupadasIniciais: number
  lanceFixoPct: number
  inicio: string
}

export async function criarGrupo(repos: Repositorios, dados: DadosGrupo): Promise<Grupo> {
  const codigo = dados.codigo.trim().toUpperCase()
  if ((await repos.grupos.listar()).some((g) => g.codigo === codigo)) {
    throw new ErroOperacao(`Já existe um grupo ${codigo}.`)
  }
  if (dados.cotasOcupadasIniciais > dados.participantes) {
    throw new ErroOperacao('Cotas ocupadas não podem passar do número de participantes.')
  }
  return repos.grupos.salvar({
    ...dados,
    codigo,
    id: novoId('g'),
    status: 'formacao',
    assembleias: [],
  })
}

export interface DadosAssembleia {
  data: string
  contempladosSorteio: number
  contempladosLance: number
  maiorLancePct: number | null
  menorLancePct: number | null
}

export async function registrarAssembleia(
  repos: Repositorios,
  grupo: Grupo,
  dados: DadosAssembleia,
): Promise<Grupo> {
  if (grupo.status !== 'andamento') {
    throw new ErroOperacao('Só grupos em andamento realizam assembleias.')
  }
  if (
    dados.maiorLancePct !== null &&
    dados.menorLancePct !== null &&
    dados.menorLancePct > dados.maiorLancePct
  ) {
    throw new ErroOperacao('O menor lance não pode ser maior que o maior lance.')
  }
  const ultima = grupo.assembleias.reduce((m, a) => Math.max(m, a.numero), 0)
  return repos.grupos.salvar({
    ...grupo,
    assembleias: [...grupo.assembleias, { ...dados, id: novoId('as'), numero: ultima + 1 }],
  })
}

const PROXIMO_STATUS: Record<StatusGrupo, StatusGrupo | null> = {
  formacao: 'andamento',
  andamento: 'encerrado',
  encerrado: null,
}

export function proximoStatusGrupo(status: StatusGrupo): StatusGrupo | null {
  return PROXIMO_STATUS[status]
}

export async function avancarStatusGrupo(repos: Repositorios, grupo: Grupo): Promise<Grupo> {
  const proximo = PROXIMO_STATUS[grupo.status]
  if (!proximo) throw new ErroOperacao('O grupo já está encerrado.')
  return repos.grupos.salvar({ ...grupo, status: proximo })
}
