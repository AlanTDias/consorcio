import { beforeEach, describe, expect, it } from 'vitest'
import { ArmazenamentoMemoria } from '../data/armazenamento'
import { criarRepositoriosLocais } from '../data/local/repositoriosLocais'
import { ErroAutenticacao } from './AuthService'
import { CHAVE_SESSAO, DemoAuthService } from './DemoAuthService'

describe('DemoAuthService', () => {
  let persistente: ArmazenamentoMemoria
  let temporario: ArmazenamentoMemoria
  let auth: DemoAuthService

  beforeEach(() => {
    persistente = new ArmazenamentoMemoria()
    temporario = new ArmazenamentoMemoria()
    auth = new DemoAuthService(
      criarRepositoriosLocais(persistente).usuarios,
      persistente,
      temporario,
    )
  })

  it('declara que é apenas demonstração', () => {
    expect(auth.ehDemonstracao).toBe(true)
  })

  it('entra com usuário de demonstração, ignorando maiúsculas e espaços no e-mail', async () => {
    const sessao = await auth.entrar({
      email: '  ANA.admin@exemplo.test ',
      senha: 'demo123',
      lembrar: false,
    })
    expect(sessao).toEqual({
      usuarioId: 'u-admin',
      nome: 'Ana Ribeiro',
      email: 'ana.admin@exemplo.test',
      perfil: 'Administrador',
    })
  })

  it('recusa senha errada e e-mail desconhecido com a mesma mensagem', async () => {
    const senhaErrada = auth.entrar({ email: 'ana.admin@exemplo.test', senha: 'x', lembrar: false })
    await expect(senhaErrada).rejects.toThrow(ErroAutenticacao)
    await expect(
      auth.entrar({ email: 'ninguem@exemplo.test', senha: 'demo123', lembrar: false }),
    ).rejects.toThrow('E-mail ou senha incorretos.')
  })

  it('sem "lembrar de mim" guarda a sessão só no armazenamento temporário', async () => {
    await auth.entrar({ email: 'julia.vendas@exemplo.test', senha: 'demo123', lembrar: false })
    expect(temporario.getItem(CHAVE_SESSAO)).not.toBeNull()
    expect(persistente.getItem(CHAVE_SESSAO)).toBeNull()
  })

  it('com "lembrar de mim" a sessão sobrevive a um novo armazenamento temporário', async () => {
    await auth.entrar({ email: 'carlos.gestor@exemplo.test', senha: 'demo123', lembrar: true })
    const novaAba = new DemoAuthService(
      criarRepositoriosLocais(persistente).usuarios,
      persistente,
      new ArmazenamentoMemoria(),
    )
    expect((await novaAba.restaurarSessao())?.perfil).toBe('Gestor')
  })

  it('sair apaga a sessão', async () => {
    await auth.entrar({ email: 'carlos.gestor@exemplo.test', senha: 'demo123', lembrar: true })
    await auth.sair()
    expect(await auth.restaurarSessao()).toBeNull()
  })

  it('perfil vem do cadastro, não do que estiver gravado no navegador', async () => {
    temporario.setItem(
      CHAVE_SESSAO,
      JSON.stringify({ usuarioId: 'u-vend-1', perfil: 'Administrador' }),
    )
    expect((await auth.restaurarSessao())?.perfil).toBe('Vendedor')
  })

  it('descarta sessão adulterada ou de usuário inexistente', async () => {
    temporario.setItem(CHAVE_SESSAO, '{quebrado')
    persistente.setItem(CHAVE_SESSAO, JSON.stringify({ usuarioId: 'u-hacker' }))
    expect(await auth.restaurarSessao()).toBeNull()
    expect(persistente.getItem(CHAVE_SESSAO)).toBeNull()
  })
})
