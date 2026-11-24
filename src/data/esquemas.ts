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

export const VERSAO_BACKUP = 1

export const backupSchema = z.object({
  app: z.literal('consorcio'),
  versao: z.literal(VERSAO_BACKUP),
  exportadoEm: z.iso.datetime(),
  dados: z.object({
    config: configSchema,
  }),
})
export type Backup = z.infer<typeof backupSchema>
