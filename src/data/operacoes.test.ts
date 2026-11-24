import { beforeEach, describe, expect, it } from 'vitest'
import type { Sessao } from '../auth/AuthService'
import { simularConsorcio } from '../domain/consorcio'
import { ArmazenamentoMemoria } from './armazenamento'
import {
  clientesExemplo,
  criarRepositoriosLocais,
  propostasExemplo,
} from './local/repositoriosLocais'
import {
  anotar,
  criarCliente,
  criarProposta,
  ErroOperacao,
  mudarEtapa,
  mudarStatus,
  visiveis,
} from './operacoes'
import type { Repositorios } from './repositorios'

const julia: Sessao = {
  usuarioId: 'u-vend-1',
  nome: 'Júlia Souza',
  email: 'julia.vendas@exemplo.test',
  perfil: 'Vendedor',
}
const gestor: Sessao = { ...julia, usuarioId: 'u-gestor', perfil: 'Gestor' }

describe('dados de exemplo', () => {
  for (const agora of [new Date(2026, 0, 1, 9), new Date(2026, 4, 31, 20), new Date()]) {
    it(`são válidos e coerentes em ${agora.toISOString().slice(0, 10)}`, () => {
      const clientes = clientesExemplo(agora)
      const propostas = propostasExemplo(agora)
      expect(clientes.every((c) => c.email.endsWith('@exemplo.test'))).toBe(true)
      expect(clientes.every((c) => c.cpf.startsWith('000.000.0'))).toBe(true)
      for (const p of propostas) {
        const cliente = clientes.find((c) => c.id === p.clienteId)
        expect(cliente?.vendedorId).toBe(p.vendedorId)
        expect(p.numero).toBe(`P-${agora.getFullYear()}-${p.numero.slice(-4)}`)
        expect(new Date(p.criadaEm).getTime()).toBeLessThanOrEqual(agora.getTime() + 864e5)
        if (p.fechadaEm) expect(p.fechadaEm >= p.criadaEm).toBe(true)
        if (p.status === 'aceita') expect(cliente?.etapa).toBe('venda')
        expect(p.parametros.carta).toBe(p.formulario.carta * 100)
        expect(() => simularConsorcio(p.parametros)).not.toThrow()
      }
      const doMes = propostas.filter(
        (p) =>
          p.status === 'aceita' &&
          p.fechadaEm &&
          new Date(p.fechadaEm).getMonth() === agora.getMonth(),
      )
      expect(doMes).toHaveLength(5)
    })
  }
})

describe('operações de clientes e propostas', () => {
  let repos: Repositorios

  beforeEach(() => {
    repos = criarRepositoriosLocais(new ArmazenamentoMemoria())
  })

  it('vendedor só vê os próprios clientes; gestor vê todos', async () => {
    const clientes = await repos.clientes.listar()
    expect(visiveis(julia, clientes).every((c) => c.vendedorId === 'u-vend-1')).toBe(true)
    expect(visiveis(julia, clientes)).toHaveLength(8)
    expect(visiveis(gestor, clientes)).toHaveLength(16)
  })

  it('cria cliente como lead e registra no histórico', async () => {
    const c = await criarCliente(repos, {
      nome: 'Teste Fictício',
      email: '',
      telefone: '(11) 90000-9999',
      cpf: '',
      categoriaInteresse: 'veiculo',
      vendedorId: 'u-vend-1',
    })
    expect(c.etapa).toBe('lead')
    expect(c.historico.map((h) => h.descricao)).toEqual(['Cliente cadastrado'])
    expect(await repos.clientes.obter(c.id)).toEqual(c)
  })

  it('recusa telefone fora do formato', async () => {
    await expect(
      criarCliente(repos, {
        nome: 'X',
        email: '',
        telefone: '123',
        cpf: '',
        categoriaInteresse: 'veiculo',
        vendedorId: 'u-vend-1',
      }),
    ).rejects.toThrow()
  })

  it('numera propostas em sequência e move o lead para proposta', async () => {
    const lead = (await repos.clientes.listar()).find((c) => c.etapa === 'lead')
    if (!lead) throw new Error('sem lead no exemplo')
    const exemplo = (await repos.propostas.listar())[0]
    if (!exemplo) throw new Error('sem proposta no exemplo')
    const ano = new Date().getFullYear()
    const p = await criarProposta(repos, {
      cliente: lead,
      vendedorId: lead.vendedorId,
      formulario: exemplo.formulario,
      parametros: exemplo.parametros,
      observacoes: '  ',
    })
    expect(p.numero).toBe(`P-${ano}-0015`)
    expect(p.status).toBe('aberta')
    const atualizado = await repos.clientes.obter(lead.id)
    expect(atualizado?.etapa).toBe('proposta')
    expect(atualizado?.historico.at(-1)?.descricao).toBe(`Proposta P-${ano}-0015 criada`)
    expect(await repos.propostas.proximoNumero(ano)).toBe(`P-${ano}-0016`)
  })

  it('aceitar a proposta leva o cliente para venda e fecha a proposta', async () => {
    const aberta = (await repos.propostas.listar()).find((p) => p.status === 'aberta')
    if (!aberta) throw new Error('sem proposta aberta')
    const aceita = await mudarStatus(repos, aberta, 'aceita', 'g-ve-118')
    expect(aceita.fechadaEm).not.toBeNull()
    expect(aceita.grupoId).toBe('g-ve-118')
    expect((await repos.clientes.obter(aberta.clienteId))?.etapa).toBe('venda')
    await expect(mudarStatus(repos, aceita, 'recusada')).rejects.toThrow(ErroOperacao)
  })

  it('muda etapa do funil e registra anotações', async () => {
    const [cliente] = await repos.clientes.listar()
    if (!cliente) throw new Error('sem cliente')
    const movido = await mudarEtapa(repos, cliente, 'proposta')
    const anotado = await anotar(repos, movido, 'u-vend-1', '  Ligar na segunda  ')
    expect(anotado.anotacoes.at(-1)?.texto).toBe('Ligar na segunda')
    await expect(anotar(repos, anotado, 'u-vend-1', '   ')).rejects.toThrow(ErroOperacao)
  })

  it('backup leva clientes e propostas e aceita backup antigo só com configuração', async () => {
    const [cliente] = await repos.clientes.listar()
    if (!cliente) throw new Error('sem cliente')
    await anotar(repos, cliente, 'u-vend-1', 'Nota do backup')
    const arquivo = await repos.backup.exportar()

    const outro = criarRepositoriosLocais(new ArmazenamentoMemoria())
    await outro.backup.importar(arquivo)
    const restaurado = await outro.clientes.obter(cliente.id)
    expect(restaurado?.anotacoes.at(-1)?.texto).toBe('Nota do backup')
    expect(await outro.propostas.listar()).toHaveLength(14)

    const antigo = JSON.parse(arquivo)
    antigo.versao = 1
    delete antigo.dados.clientes
    delete antigo.dados.propostas
    await outro.backup.importar(JSON.stringify(antigo))
    expect((await outro.clientes.obter(cliente.id))?.anotacoes.at(-1)?.texto).toBe('Nota do backup')
  })
})
