import { beforeEach, describe, expect, it } from 'vitest'
import { ArmazenamentoMemoria } from './armazenamento'
import {
  avancarStatusGrupo,
  criarGrupo,
  gruposComVaga,
  ocupacao,
  registrarAssembleia,
} from './grupos'
import { gruposExemplo, criarRepositoriosLocais } from './local/repositoriosLocais'
import { ErroOperacao, mudarStatus } from './operacoes'
import type { Repositorios } from './repositorios'

describe('grupos e cotas', () => {
  let repos: Repositorios

  beforeEach(() => {
    repos = criarRepositoriosLocais(new ArmazenamentoMemoria())
  })

  it('os grupos de exemplo são válidos', () => {
    const grupos = gruposExemplo()
    expect(grupos).toHaveLength(6)
    expect(grupos.every((g) => g.cotasOcupadasIniciais <= g.participantes)).toBe(true)
  })

  it('ocupação soma as cotas iniciais e as vendas aceitas vinculadas', async () => {
    const grupo = await repos.grupos.obter('g-im-301')
    if (!grupo) throw new Error('grupo ausente')
    const o = ocupacao(grupo, await repos.propostas.listar())
    expect(o.vendidasPeloSistema).toBe(4)
    expect(o.ocupadas).toBe(240)
    expect(o.disponiveis).toBe(60)
    expect(o.pct).toBe(80)
  })

  it('grupos com vaga excluem encerrados e outras categorias', async () => {
    const lista = gruposComVaga(
      await repos.grupos.listar(),
      await repos.propostas.listar(),
      'servico',
    )
    expect(lista.map((g) => g.codigo)).toEqual(['SE-042'])
  })

  it('cria grupo em formação e recusa código repetido', async () => {
    const dados = {
      codigo: 've-200',
      categoriaId: 'veiculo',
      prazoMeses: 72,
      participantes: 100,
      cotasOcupadasIniciais: 0,
      lanceFixoPct: 25,
      inicio: new Date().toISOString(),
    }
    const g = await criarGrupo(repos, dados)
    expect(g.codigo).toBe('VE-200')
    expect(g.status).toBe('formacao')
    await expect(criarGrupo(repos, dados)).rejects.toThrow('Já existe um grupo VE-200.')
  })

  it('registra assembleia com número sequencial só em grupo em andamento', async () => {
    const grupo = await repos.grupos.obter('g-im-301')
    const formacao = await repos.grupos.obter('g-im-305')
    if (!grupo || !formacao) throw new Error('grupo ausente')
    const dados = {
      data: new Date().toISOString(),
      contempladosSorteio: 2,
      contempladosLance: 3,
      maiorLancePct: 50,
      menorLancePct: 30,
    }
    const atualizado = await registrarAssembleia(repos, grupo, dados)
    expect(atualizado.assembleias.at(-1)?.numero).toBe(4)
    await expect(registrarAssembleia(repos, formacao, dados)).rejects.toThrow(ErroOperacao)
    await expect(
      registrarAssembleia(repos, atualizado, { ...dados, maiorLancePct: 10, menorLancePct: 20 }),
    ).rejects.toThrow('menor lance')
  })

  it('status do grupo avança de formação para andamento e encerrado', async () => {
    const g = await repos.grupos.obter('g-im-305')
    if (!g) throw new Error('grupo ausente')
    const andamento = await avancarStatusGrupo(repos, g)
    expect(andamento.status).toBe('andamento')
    const encerrado = await avancarStatusGrupo(repos, andamento)
    await expect(avancarStatusGrupo(repos, encerrado)).rejects.toThrow('encerrado')
  })

  it('venda só entra em grupo da mesma categoria e com vaga', async () => {
    const aberta = (await repos.propostas.listar()).find(
      (p) => p.status === 'aberta' && p.categoriaId === 'veiculo',
    )
    if (!aberta) throw new Error('sem proposta aberta de veículo')
    await expect(mudarStatus(repos, aberta, 'aceita', 'g-im-301')).rejects.toThrow('não tem vaga')
    await expect(mudarStatus(repos, aberta, 'aceita', 'g-inexistente')).rejects.toThrow()
    const cheio = await repos.grupos.obter('g-ve-120')
    if (!cheio) throw new Error('grupo ausente')
    await repos.grupos.salvar({ ...cheio, cotasOcupadasIniciais: cheio.participantes })
    await expect(mudarStatus(repos, aberta, 'aceita', 'g-ve-120')).rejects.toThrow('não tem vaga')
    const ok = await mudarStatus(repos, aberta, 'aceita', 'g-ve-118')
    expect(ok.grupoId).toBe('g-ve-118')
  })
})
