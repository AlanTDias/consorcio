import type { Cliente, Config, Grupo, Proposta, Usuario } from './esquemas'

export interface ConfigRepositorio {
  obter(): Promise<Config>
  salvar(config: Config): Promise<Config>
}

export interface UsuarioRepositorio {
  listar(): Promise<Usuario[]>
  buscarPorEmail(email: string): Promise<Usuario | undefined>
  obter(id: string): Promise<Usuario | undefined>
}

export interface Repositorio<T extends { id: string }> {
  listar(): Promise<T[]>
  obter(id: string): Promise<T | undefined>
  salvar(item: T): Promise<T>
}

export interface PropostaRepositorio extends Repositorio<Proposta> {
  proximoNumero(ano: number): Promise<string>
}

export interface BackupServico {
  exportar(): Promise<string>
  importar(conteudo: string): Promise<void>
  restaurarExemplo(): Promise<void>
}

export interface Repositorios {
  config: ConfigRepositorio
  usuarios: UsuarioRepositorio
  clientes: Repositorio<Cliente>
  propostas: PropostaRepositorio
  grupos: Repositorio<Grupo>
  backup: BackupServico
}
