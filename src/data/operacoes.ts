import type { Sessao } from '../auth/AuthService'
import { podeVerTodos } from '../auth/permissoes'
import type { Cliente, EtapaFunil, FormularioSimulacao, Proposta, StatusProposta } from './esquemas'
import type { ParametrosConsorcio } from '../domain/consorcio'
import type { Repositorios } from './repositorios'

export class ErroOperacao extends Error {}

export const ROTULO_ETAPA: Record<EtapaFunil, string> = {
  lead: 'Lead',
  proposta: 'Proposta',
  venda: 'Venda',
}

export const ROTULO_STATUS: Record<StatusProposta, string> = {
  aberta: 'Em aberto',
  enviada: 'Enviada',
  aceita: 'Aceita',
  recusada: 'Recusada',
}

const TRANSICOES: Record<StatusProposta, readonly StatusProposta[]> = {
  aberta: ['enviada', 'aceita', 'recusada'],
  enviada: ['aceita', 'recusada'],
  aceita: [],
  recusada: [],
}

export function proximosStatus(status: StatusProposta): readonly StatusProposta[] {
  return TRANSICOES[status]
}

export function novoId(prefixo: string): string {
  return `${prefixo}-${crypto.randomUUID()}`
}

const agoraIso = () => new Date().toISOString()

function evento(descricao: string) {
  return { id: novoId('h'), data: agoraIso(), descricao }
}

export function podeVer(sessao: Sessao, registro: { vendedorId: string }): boolean {
  return podeVerTodos(sessao.perfil) || registro.vendedorId === sessao.usuarioId
}

export function visiveis<T extends { vendedorId: string }>(sessao: Sessao, lista: T[]): T[] {
  return lista.filter((item) => podeVer(sessao, item))
}

export interface DadosCliente {
  nome: string
  email: string
  telefone: string
  cpf: string
  categoriaInteresse: string
  vendedorId: string
}

export async function criarCliente(repos: Repositorios, dados: DadosCliente): Promise<Cliente> {
  const agora = agoraIso()
  return repos.clientes.salvar({
    ...dados,
    id: novoId('c'),
    etapa: 'lead',
    criadoEm: agora,
    atualizadoEm: agora,
    anotacoes: [],
    historico: [evento('Cliente cadastrado')],
  })
}

export async function atualizarCliente(
  repos: Repositorios,
  cliente: Cliente,
  dados: DadosCliente,
): Promise<Cliente> {
  return repos.clientes.salvar({
    ...cliente,
    ...dados,
    atualizadoEm: agoraIso(),
    historico: [...cliente.historico, evento('Dados do cliente atualizados')],
  })
}

export async function mudarEtapa(
  repos: Repositorios,
  cliente: Cliente,
  etapa: EtapaFunil,
): Promise<Cliente> {
  if (cliente.etapa === etapa) return cliente
  return repos.clientes.salvar({
    ...cliente,
    etapa,
    atualizadoEm: agoraIso(),
    historico: [
      ...cliente.historico,
      evento(`Etapa: ${ROTULO_ETAPA[cliente.etapa]} → ${ROTULO_ETAPA[etapa]}`),
    ],
  })
}

export async function anotar(
  repos: Repositorios,
  cliente: Cliente,
  autorId: string,
  texto: string,
): Promise<Cliente> {
  const limpo = texto.trim()
  if (!limpo) throw new ErroOperacao('Escreva a anotação.')
  return repos.clientes.salvar({
    ...cliente,
    atualizadoEm: agoraIso(),
    anotacoes: [...cliente.anotacoes, { id: novoId('a'), data: agoraIso(), autorId, texto: limpo }],
  })
}

export async function criarProposta(
  repos: Repositorios,
  entrada: {
    cliente: Cliente
    vendedorId: string
    formulario: FormularioSimulacao
    parametros: ParametrosConsorcio
    observacoes: string
  },
): Promise<Proposta> {
  const agora = agoraIso()
  const numero = await repos.propostas.proximoNumero(new Date().getFullYear())
  const proposta = await repos.propostas.salvar({
    id: novoId('p'),
    numero,
    clienteId: entrada.cliente.id,
    vendedorId: entrada.vendedorId,
    categoriaId: entrada.formulario.categoriaId,
    status: 'aberta',
    criadaEm: agora,
    atualizadaEm: agora,
    fechadaEm: null,
    grupoId: null,
    formulario: entrada.formulario,
    parametros: entrada.parametros,
    observacoes: entrada.observacoes.trim(),
  })
  const cliente = entrada.cliente
  await repos.clientes.salvar({
    ...cliente,
    etapa: cliente.etapa === 'lead' ? 'proposta' : cliente.etapa,
    atualizadoEm: agora,
    historico: [...cliente.historico, evento(`Proposta ${numero} criada`)],
  })
  return proposta
}

export async function mudarStatus(
  repos: Repositorios,
  proposta: Proposta,
  status: StatusProposta,
  grupoId: string | null = proposta.grupoId,
): Promise<Proposta> {
  if (!TRANSICOES[proposta.status].includes(status)) {
    throw new ErroOperacao(
      `Não é possível mudar de "${ROTULO_STATUS[proposta.status]}" para "${ROTULO_STATUS[status]}".`,
    )
  }
  if (status === 'aceita' && grupoId) {
    const grupo = await repos.grupos.obter(grupoId)
    const vendidas = (await repos.propostas.listar()).filter(
      (p) => p.grupoId === grupoId && p.status === 'aceita' && p.id !== proposta.id,
    ).length
    const semVaga =
      !grupo ||
      grupo.categoriaId !== proposta.categoriaId ||
      grupo.status === 'encerrado' ||
      grupo.cotasOcupadasIniciais + vendidas >= grupo.participantes
    if (semVaga) throw new ErroOperacao('O grupo escolhido não tem vaga para esta categoria.')
  }
  const agora = agoraIso()
  const final = status === 'aceita' || status === 'recusada'
  const salva = await repos.propostas.salvar({
    ...proposta,
    status,
    grupoId,
    atualizadaEm: agora,
    fechadaEm: final ? agora : null,
  })
  const cliente = await repos.clientes.obter(proposta.clienteId)
  if (cliente) {
    await repos.clientes.salvar({
      ...cliente,
      etapa: status === 'aceita' ? 'venda' : cliente.etapa,
      atualizadoEm: agora,
      historico: [
        ...cliente.historico,
        evento(`Proposta ${proposta.numero}: ${ROTULO_STATUS[status].toLowerCase()}`),
      ],
    })
  }
  return salva
}
