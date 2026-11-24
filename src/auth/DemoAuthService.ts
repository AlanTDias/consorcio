import { z } from 'zod'
import { lerJson, type Armazenamento } from '../data/armazenamento'
import type { UsuarioRepositorio } from '../data/repositorios'
import { ErroAutenticacao, type AuthService, type Credenciais, type Sessao } from './AuthService'

/**
 * Login APENAS DE DEMONSTRAÇÃO: compara com senhas fictícias públicas do seed.
 * Não oferece segurança alguma. Substituir por um AuthService real antes de uso em produção.
 */
export const CHAVE_SESSAO = 'consorcio:v1:sessao-demo'

const sessaoGravadaSchema = z.object({ usuarioId: z.string().min(1).max(40) })

export class DemoAuthService implements AuthService {
  readonly ehDemonstracao = true

  constructor(
    private readonly usuarios: UsuarioRepositorio,
    private readonly persistente: Armazenamento,
    private readonly temporario: Armazenamento,
  ) {}

  async entrar({ email, senha, lembrar }: Credenciais): Promise<Sessao> {
    const usuario = await this.usuarios.buscarPorEmail(email)
    if (!usuario || usuario.senhaDemo !== senha) {
      throw new ErroAutenticacao('E-mail ou senha incorretos.')
    }
    this.limpar()
    const destino = lembrar ? this.persistente : this.temporario
    destino.setItem(CHAVE_SESSAO, JSON.stringify({ usuarioId: usuario.id }))
    return {
      usuarioId: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
    }
  }

  async sair(): Promise<void> {
    this.limpar()
  }

  async restaurarSessao(): Promise<Sessao | null> {
    for (const armazenamento of [this.temporario, this.persistente]) {
      const gravada = sessaoGravadaSchema.safeParse(lerJson(armazenamento, CHAVE_SESSAO))
      if (!gravada.success) continue
      const usuario = await this.usuarios.obter(gravada.data.usuarioId)
      if (usuario) {
        return {
          usuarioId: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          perfil: usuario.perfil,
        }
      }
    }
    this.limpar()
    return null
  }

  private limpar(): void {
    this.persistente.removeItem(CHAVE_SESSAO)
    this.temporario.removeItem(CHAVE_SESSAO)
  }
}
