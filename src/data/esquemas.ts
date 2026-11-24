import { z } from 'zod'

const textoCurto = (max: number) => z.string().trim().min(1, 'Campo obrigatório').max(max)
const percentual = z.number().finite().min(0).max(100)

export const perfis = ['Administrador', 'Gestor', 'Vendedor'] as const
export const perfilSchema = z.enum(perfis)
export type Perfil = z.infer<typeof perfilSchema>

export const usuarioSchema = z.object({
  id: textoCurto(40),
  nome: textoCurto(80),
  email: z.email(),
  perfil: perfilSchema,
  senhaDemo: textoCurto(40),
})
export type Usuario = z.infer<typeof usuarioSchema>

export const CNPJ_REGEX = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/

export const empresaSchema = z.object({
  nomeSistema: textoCurto(40),
  razaoSocial: textoCurto(120),
  cnpj: z.string().trim().regex(CNPJ_REGEX, 'Use o formato 00.000.000/0000-00'),
  administradoraParceira: textoCurto(120),
})
export type Empresa = z.infer<typeof empresaSchema>

export const indiceSchema = z.object({
  codigo: z
    .string()
    .trim()
    .regex(/^[A-Z0-9-]{2,12}$/),
  nome: textoCurto(60),
  anualPct: z.number().finite().min(-20).max(50),
})
export type Indice = z.infer<typeof indiceSchema>

export const categoriaSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{2,30}$/),
  nome: textoCurto(40),
  indice: z.string().regex(/^[A-Z0-9-]{2,12}$/),
  prazoMinMeses: z.number().int().min(1).max(420),
  prazoMaxMeses: z.number().int().min(1).max(420),
  cartaMin: z.number().int().min(1000).max(100_000_000),
  cartaMax: z.number().int().min(1000).max(100_000_000),
  lanceFixoPct: z.number().finite().min(1).max(100).default(30),
})
export type Categoria = z.infer<typeof categoriaSchema>

export const taxasSchema = z.object({
  admAnualPct: percentual,
  fundoReservaPct: percentual,
  seguroMensalPct: percentual,
  lanceEmbutidoMaxPct: percentual,
  parcelaReduzidaPct: z.number().finite().min(1).max(100),
})
export type Taxas = z.infer<typeof taxasSchema>

export const configSchema = z.object({
  empresa: empresaSchema,
  taxas: taxasSchema,
  indices: z.array(indiceSchema).min(1).max(20),
  categorias: z.array(categoriaSchema).min(1).max(20),
})
export type Config = z.infer<typeof configSchema>

export const formularioSimulacaoSchema = z.object({
  categoriaId: z.string().min(1).max(30),
  carta: z.number().int().min(0).max(100_000_000),
  prazo: z.number(),
  seguro: z.boolean(),
  reajuste: z.boolean(),
  parcelaReduzida: z.boolean(),
  contemplacao: z.enum(['nenhuma', 'sorteio', 'lance']),
  mesContemplacao: z.number(),
  tipoLance: z.enum(['livre', 'embutido', 'fixo']),
  pctLance: z.number(),
  efeitoLance: z.enum(['parcela', 'prazo']),
})
export type FormularioSimulacao = z.infer<typeof formularioSimulacaoSchema>

const pctNulo = z.number().finite().min(-99).max(100).nullable()
const mesSchema = z.number().int().min(1).max(420)

export const parametrosConsorcioSchema = z.object({
  carta: z.number().int().positive().max(10_000_000_000),
  prazoMeses: mesSchema,
  taxaAdmAnualPct: z.number().finite().min(0).max(100),
  fundoReservaPct: z.number().finite().min(0).max(100),
  seguroMensalPct: pctNulo,
  reajusteAnualPct: pctNulo,
  parcelaReduzidaPct: pctNulo,
  contemplacao: z
    .discriminatedUnion('tipo', [
      z.object({ tipo: z.literal('sorteio'), mes: mesSchema }),
      z.object({
        tipo: z.literal('lance'),
        mes: mesSchema,
        lance: z.object({
          tipo: z.enum(['livre', 'embutido', 'fixo']),
          pct: z.number().finite().positive().max(100),
          efeito: z.enum(['parcela', 'prazo']),
        }),
      }),
    ])
    .nullable(),
})

const id = z.string().regex(/^[a-z0-9-]{2,40}$/)
const data = z.iso.datetime({ offset: true })
const textoOpcional = (max: number) => z.string().trim().max(max)

export const etapasFunil = ['lead', 'proposta', 'venda'] as const
export type EtapaFunil = (typeof etapasFunil)[number]

export const TELEFONE_REGEX = /^\(\d{2}\) \d{4,5}-\d{4}$/
export const CPF_REGEX = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/

export const anotacaoSchema = z.object({
  id,
  data,
  autorId: id,
  texto: z.string().trim().min(1, 'Escreva a anotação').max(1000),
})
export type Anotacao = z.infer<typeof anotacaoSchema>

export const eventoHistoricoSchema = z.object({
  id,
  data,
  descricao: z.string().trim().min(1).max(200),
})
export type EventoHistorico = z.infer<typeof eventoHistoricoSchema>

export const clienteSchema = z.object({
  id,
  nome: textoCurto(80),
  email: z.union([z.literal(''), z.email('E-mail inválido')]),
  telefone: z.union([z.literal(''), z.string().regex(TELEFONE_REGEX, 'Use (11) 90000-0000')]),
  cpf: z.union([z.literal(''), z.string().regex(CPF_REGEX, 'Use 000.000.000-00')]),
  categoriaInteresse: z.string().min(1).max(30),
  etapa: z.enum(etapasFunil),
  vendedorId: id,
  criadoEm: data,
  atualizadoEm: data,
  anotacoes: z.array(anotacaoSchema).max(500),
  historico: z.array(eventoHistoricoSchema).max(500),
})
export type Cliente = z.infer<typeof clienteSchema>

export const statusProposta = ['aberta', 'enviada', 'aceita', 'recusada'] as const
export type StatusProposta = (typeof statusProposta)[number]

export const propostaSchema = z.object({
  id,
  numero: z.string().regex(/^P-\d{4}-\d{4}$/),
  clienteId: id,
  vendedorId: id,
  categoriaId: z.string().min(1).max(30),
  status: z.enum(statusProposta),
  criadaEm: data,
  atualizadaEm: data,
  fechadaEm: data.nullable(),
  grupoId: id.nullable(),
  formulario: formularioSimulacaoSchema,
  parametros: parametrosConsorcioSchema,
  observacoes: textoOpcional(1000),
})
export type Proposta = z.infer<typeof propostaSchema>

export const VERSAO_BACKUP = 2

export const backupSchema = z.object({
  app: z.literal('consorcio'),
  versao: z.number().int().min(1).max(VERSAO_BACKUP),
  exportadoEm: z.iso.datetime(),
  dados: z.object({
    config: configSchema,
    clientes: z.array(clienteSchema).max(5000).optional(),
    propostas: z.array(propostaSchema).max(5000).optional(),
  }),
})
export type Backup = z.infer<typeof backupSchema>
