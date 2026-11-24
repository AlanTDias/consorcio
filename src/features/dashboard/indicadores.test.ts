import { describe, expect, it } from 'vitest'
import type { Sessao } from '../../auth/AuthService'
import { configSchema, usuarioSchema } from '../../data/esquemas'
import { propostasExemplo } from '../../data/local/repositoriosLocais'
import seedConfig from '../../data/seed/config.json'
import seedUsuarios from '../../data/seed/usuarios.json'
import { reaisParaCentavos as r } from '../../domain/dinheiro'
import { calcularIndicadores, periodoDoMes } from './indicadores'

const agora = new Date(2026, 10, 23, 15)
const config = configSchema.parse(seedConfig)
const usuarios = usuarioSchema.array().parse(seedUsuarios)
const propostas = propostasExemplo(agora)
const gestor: Sessao = {
  usuarioId: 'u-gestor',
  nome: 'Carlos Mendes',
  email: 'carlos.gestor@exemplo.test',
  perfil: 'Gestor',
}
const julia: Sessao = { ...gestor, usuarioId: 'u-vend-1', perfil: 'Vendedor' }

describe('indicadores do dashboard', () => {
  it('equipe no mês atual: 5 vendas e R$ 970.000 em cartas', () => {
    const i = calcularIndicadores({
      sessao: gestor,
      propostas,
      usuarios,
      config,
      periodo: periodoDoMes(agora),
    })
    expect(i.vendas).toBe(5)
    expect(i.volume).toBe(r(970_000))
    expect(i.ticketMedio).toBe(r(194_000))
    expect(i.emAberto).toBe(4)
    expect(i.porCategoria.map((c) => [c.nome, c.cotas])).toEqual([
      ['Imóvel', 2],
      ['Veículo', 2],
      ['Serviço', 1],
    ])
    expect(i.ranking.map((l) => [l.nome, l.volume])).toEqual([
      ['Marcos Prado', r(570_000)],
      ['Júlia Souza', r(400_000)],
    ])
    expect(i.metas.map((m) => m.pct)).toEqual([95, 66.7])
  })

  it('vendedora vê os próprios números, a própria meta e o ranking da equipe', () => {
    const i = calcularIndicadores({
      sessao: julia,
      propostas,
      usuarios,
      config,
      periodo: periodoDoMes(agora),
    })
    expect(i.vendas).toBe(3)
    expect(i.volume).toBe(r(400_000))
    expect(i.emAberto).toBe(2)
    expect(i.metas).toHaveLength(1)
    expect(i.metas[0]?.meta).toBe(r(600_000))
    expect(i.ranking).toHaveLength(2)
  })

  it('mês anterior considera só as vendas fechadas nele', () => {
    const i = calcularIndicadores({
      sessao: gestor,
      propostas,
      usuarios,
      config,
      periodo: periodoDoMes(agora, -1),
    })
    expect(i.vendas).toBe(3)
    expect(i.volume).toBe(r(690_000))
  })
})
