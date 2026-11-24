import type { z } from 'zod'
import { lerJson, type Armazenamento } from '../armazenamento'
import {
  backupSchema,
  clienteSchema,
  configSchema,
  grupoSchema,
  propostaSchema,
  usuarioSchema,
  VERSAO_BACKUP,
  type Backup,
  type Cliente,
  type Config,
  type Grupo,
  type Proposta,
  type Usuario,
} from '../esquemas'
import type {
  BackupServico,
  ConfigRepositorio,
  PropostaRepositorio,
  Repositorio,
  Repositorios,
  UsuarioRepositorio,
} from '../repositorios'
import seedClientes from '../seed/clientes.json'
import seedConfig from '../seed/config.json'
import seedGrupos from '../seed/grupos.json'
import seedPropostas from '../seed/propostas.json'
import seedUsuarios from '../seed/usuarios.json'
import { materializarDatas } from '../seed/datas'

export const CHAVES = {
  config: 'consorcio:v1:config',
  clientes: 'consorcio:v1:clientes',
  propostas: 'consorcio:v1:propostas',
  grupos: 'consorcio:v1:grupos',
} as const

export const TAMANHO_MAXIMO_BACKUP = 5 * 1024 * 1024

export class ErroBackup extends Error {}

const configExemplo: Config = configSchema.parse(seedConfig)
const usuariosExemplo: Usuario[] = usuarioSchema.array().parse(seedUsuarios)

export function clientesExemplo(agora = new Date()): Cliente[] {
  return clienteSchema.array().parse(materializarDatas(seedClientes, agora))
}

export function propostasExemplo(agora = new Date()): Proposta[] {
  return propostaSchema.array().parse(materializarDatas(seedPropostas, agora))
}

export function gruposExemplo(agora = new Date()): Grupo[] {
  return grupoSchema.array().parse(materializarDatas(seedGrupos, agora))
}

class ConfigLocal implements ConfigRepositorio {
  constructor(private readonly armazenamento: Armazenamento) {}

  async obter(): Promise<Config> {
    const salvo = configSchema.safeParse(lerJson(this.armazenamento, CHAVES.config))
    return salvo.success ? salvo.data : structuredClone(configExemplo)
  }

  async salvar(config: Config): Promise<Config> {
    const valido = configSchema.parse(config)
    this.armazenamento.setItem(CHAVES.config, JSON.stringify(valido))
    return valido
  }
}

class UsuariosSeed implements UsuarioRepositorio {
  async listar(): Promise<Usuario[]> {
    return structuredClone(usuariosExemplo)
  }

  async buscarPorEmail(email: string): Promise<Usuario | undefined> {
    const alvo = email.trim().toLowerCase()
    return usuariosExemplo.find((u) => u.email.toLowerCase() === alvo)
  }

  async obter(id: string): Promise<Usuario | undefined> {
    return usuariosExemplo.find((u) => u.id === id)
  }
}

class ColecaoLocal<T extends { id: string }> implements Repositorio<T> {
  constructor(
    protected readonly armazenamento: Armazenamento,
    private readonly chave: string,
    private readonly schema: z.ZodType<T>,
    private readonly exemplo: () => T[],
  ) {}

  async listar(): Promise<T[]> {
    const bruto = lerJson(this.armazenamento, this.chave)
    if (bruto === undefined) return this.exemplo()
    const lido = this.schema.array().safeParse(bruto)
    return lido.success ? lido.data : this.exemplo()
  }

  async obter(id: string): Promise<T | undefined> {
    return (await this.listar()).find((item) => item.id === id)
  }

  async salvar(item: T): Promise<T> {
    const valido = this.schema.parse(item)
    const lista = await this.listar()
    const indice = lista.findIndex((x) => x.id === valido.id)
    if (indice >= 0) lista[indice] = valido
    else lista.push(valido)
    this.gravar(lista)
    return valido
  }

  gravar(lista: T[]): void {
    this.armazenamento.setItem(this.chave, JSON.stringify(this.schema.array().parse(lista)))
  }
}

class PropostasLocal extends ColecaoLocal<Proposta> implements PropostaRepositorio {
  async proximoNumero(ano: number): Promise<string> {
    const prefixo = `P-${ano}-`
    const maior = (await this.listar())
      .filter((p) => p.numero.startsWith(prefixo))
      .reduce((m, p) => Math.max(m, Number(p.numero.slice(prefixo.length))), 0)
    return `${prefixo}${String(maior + 1).padStart(4, '0')}`
  }
}

class BackupLocal implements BackupServico {
  constructor(
    private readonly armazenamento: Armazenamento,
    private readonly config: ConfigRepositorio,
    private readonly clientes: ColecaoLocal<Cliente>,
    private readonly propostas: ColecaoLocal<Proposta>,
    private readonly grupos: ColecaoLocal<Grupo>,
  ) {}

  async exportar(): Promise<string> {
    const backup: Backup = {
      app: 'consorcio',
      versao: VERSAO_BACKUP,
      exportadoEm: new Date().toISOString(),
      dados: {
        config: await this.config.obter(),
        clientes: await this.clientes.listar(),
        propostas: await this.propostas.listar(),
        grupos: await this.grupos.listar(),
      },
    }
    return JSON.stringify(backup, null, 2)
  }

  async importar(conteudo: string): Promise<void> {
    if (conteudo.length > TAMANHO_MAXIMO_BACKUP) {
      throw new ErroBackup('Arquivo muito grande para um backup deste sistema.')
    }
    let bruto: unknown
    try {
      bruto = JSON.parse(conteudo)
    } catch {
      throw new ErroBackup('O arquivo não é um JSON válido.')
    }
    const resultado = backupSchema.safeParse(bruto)
    if (!resultado.success) {
      throw new ErroBackup('O arquivo não é um backup válido deste sistema.')
    }
    const { config, clientes, propostas, grupos } = resultado.data.dados
    await this.config.salvar(config)
    if (clientes) this.clientes.gravar(clientes)
    if (propostas) this.propostas.gravar(propostas)
    if (grupos) this.grupos.gravar(grupos)
  }

  async restaurarExemplo(): Promise<void> {
    Object.values(CHAVES).forEach((chave) => this.armazenamento.removeItem(chave))
  }
}

export function criarRepositoriosLocais(armazenamento: Armazenamento): Repositorios {
  const config = new ConfigLocal(armazenamento)
  const clientes = new ColecaoLocal(armazenamento, CHAVES.clientes, clienteSchema, () =>
    clientesExemplo(),
  )
  const propostas = new PropostasLocal(armazenamento, CHAVES.propostas, propostaSchema, () =>
    propostasExemplo(),
  )
  const grupos = new ColecaoLocal(armazenamento, CHAVES.grupos, grupoSchema, () => gruposExemplo())
  return {
    config,
    usuarios: new UsuariosSeed(),
    clientes,
    propostas,
    grupos,
    backup: new BackupLocal(armazenamento, config, clientes, propostas, grupos),
  }
}
