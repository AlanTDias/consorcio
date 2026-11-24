import { beforeEach, describe, expect, it } from 'vitest'
import { ArmazenamentoMemoria } from './armazenamento'
import { CHAVES, criarRepositoriosLocais, ErroBackup } from './local/repositoriosLocais'
import type { Repositorios } from './repositorios'
import seedConfig from './seed/config.json'

describe('repositório de configuração e backup', () => {
  let armazenamento: ArmazenamentoMemoria
  let repos: Repositorios

  beforeEach(() => {
    armazenamento = new ArmazenamentoMemoria()
    repos = criarRepositoriosLocais(armazenamento)
  })

  it('sem dados salvos devolve a configuração de exemplo', async () => {
    expect(await repos.config.obter()).toEqual(seedConfig)
  })

  it('a configuração de exemplo usa 1% de taxa de adm. ao ano e 1% de fundo de reserva', async () => {
    const { taxas } = await repos.config.obter()
    expect(taxas.admAnualPct).toBe(1)
    expect(taxas.fundoReservaPct).toBe(1)
  })

  it('salva e lê a configuração', async () => {
    const config = await repos.config.obter()
    config.empresa.razaoSocial = 'Outra Empresa Fictícia Ltda.'
    await repos.config.salvar(config)
    expect((await repos.config.obter()).empresa.razaoSocial).toBe('Outra Empresa Fictícia Ltda.')
  })

  it('recusa salvar configuração inválida', async () => {
    const config = await repos.config.obter()
    config.empresa.cnpj = '123'
    await expect(repos.config.salvar(config)).rejects.toThrow()
  })

  it('ignora dado corrompido no navegador e volta ao exemplo', async () => {
    armazenamento.setItem(CHAVES.config, '{"empresa": 1}')
    expect(await repos.config.obter()).toEqual(seedConfig)
  })

  it('exporta e importa em outro navegador mantendo os dados', async () => {
    const config = await repos.config.obter()
    config.taxas.fundoReservaPct = 2
    await repos.config.salvar(config)
    const arquivo = await repos.backup.exportar()

    const outro = criarRepositoriosLocais(new ArmazenamentoMemoria())
    await outro.backup.importar(arquivo)
    expect((await outro.config.obter()).taxas.fundoReservaPct).toBe(2)
  })

  it('recusa arquivo que não é JSON', async () => {
    await expect(repos.backup.importar('não é json')).rejects.toThrow(ErroBackup)
  })

  it('recusa JSON de outro sistema sem alterar os dados', async () => {
    const config = await repos.config.obter()
    config.empresa.razaoSocial = 'Mantida Ltda.'
    await repos.config.salvar(config)
    await expect(repos.backup.importar('{"app":"outro","dados":{}}')).rejects.toThrow(
      'O arquivo não é um backup válido deste sistema.',
    )
    expect((await repos.config.obter()).empresa.razaoSocial).toBe('Mantida Ltda.')
  })

  it('restaurar exemplo apaga os dados do usuário', async () => {
    const config = await repos.config.obter()
    config.empresa.razaoSocial = 'Temporária Ltda.'
    await repos.config.salvar(config)
    await repos.backup.restaurarExemplo()
    expect(await repos.config.obter()).toEqual(seedConfig)
  })
})
