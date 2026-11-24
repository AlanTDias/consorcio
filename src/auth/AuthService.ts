import type { Perfil } from '../data/esquemas'

export interface Sessao {
  usuarioId: string
  nome: string
  email: string
  perfil: Perfil
}

export interface Credenciais {
  email: string
  senha: string
  lembrar: boolean
}

export interface AuthService {
  readonly ehDemonstracao: boolean
  entrar(credenciais: Credenciais): Promise<Sessao>
  sair(): Promise<void>
  restaurarSessao(): Promise<Sessao | null>
}

export class ErroAutenticacao extends Error {}
