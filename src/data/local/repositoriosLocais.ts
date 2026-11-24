import { lerJson, type Armazenamento } from '../armazenamento'
import {
  backupSchema,
  configSchema,
  usuarioSchema,
  VERSAO_BACKUP,
  type Backup,
  type Config,
  type Usuario,
} from '../esquemas'
import type {
  BackupServico,
  ConfigRepositorio,
  Repositorios,
  UsuarioRepositorio,
} from '../repositorios'
import seedConfig from '../seed/config.json'
import seedUsuarios from '../seed/usuarios.json'

export const CHAVES = {
  config: 'consorcio:v1:config',
} as const

export const TAMANHO_MAXIMO_BACKUP = 2 * 1024 * 1024

export class ErroBackup extends Error {}

const configExemplo: Config = configSchema.parse(seedConfig)
const usuariosExemplo: Usuario[] = usuarioSchema.array().parse(seedUsuarios)

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

class BackupLocal implements BackupServico {
  constructor(
    private readonly armazenamento: Armazenamento,
    private readonly config: ConfigRepositorio,
  ) {}

  async exportar(): Promise<string> {
    const backup: Backup = {
      app: 'consorcio',
      versao: VERSAO_BACKUP,
      exportadoEm: new Date().toISOString(),
      dados: { config: await this.config.obter() },
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
    await this.config.salvar(resultado.data.dados.config)
  }

  async restaurarExemplo(): Promise<void> {
    Object.values(CHAVES).forEach((chave) => this.armazenamento.removeItem(chave))
  }
}

export function criarRepositoriosLocais(armazenamento: Armazenamento): Repositorios {
  const config = new ConfigLocal(armazenamento)
  return {
    config,
    usuarios: new UsuariosSeed(),
    backup: new BackupLocal(armazenamento, config),
  }
}
