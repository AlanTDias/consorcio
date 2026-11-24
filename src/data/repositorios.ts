import type { Config, Usuario } from './esquemas'

export interface ConfigRepositorio {
  obter(): Promise<Config>
  salvar(config: Config): Promise<Config>
}

export interface UsuarioRepositorio {
  listar(): Promise<Usuario[]>
  buscarPorEmail(email: string): Promise<Usuario | undefined>
  obter(id: string): Promise<Usuario | undefined>
}

export interface BackupServico {
  exportar(): Promise<string>
  importar(conteudo: string): Promise<void>
  restaurarExemplo(): Promise<void>
}

export interface Repositorios {
  config: ConfigRepositorio
  usuarios: UsuarioRepositorio
  backup: BackupServico
}
