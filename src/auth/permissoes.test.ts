import { describe, expect, it } from 'vitest'
import { ehModulo, modulos, modulosPermitidos, podeAcessar } from './permissoes'

describe('permissões por perfil', () => {
  it('Administrador acessa todos os módulos', () => {
    for (const modulo of modulos) expect(podeAcessar('Administrador', modulo)).toBe(true)
  })

  it('Gestor acessa tudo menos Configurações', () => {
    expect(podeAcessar('Gestor', 'grupos')).toBe(true)
    expect(podeAcessar('Gestor', 'configuracoes')).toBe(false)
  })

  it('Vendedor não acessa Grupos nem Configurações', () => {
    expect(modulosPermitidos('Vendedor')).toEqual([
      'dashboard',
      'simulador',
      'comparador',
      'clientes',
      'propostas',
    ])
    expect(podeAcessar('Vendedor', 'grupos')).toBe(false)
    expect(podeAcessar('Vendedor', 'configuracoes')).toBe(false)
  })

  it('reconhece apenas módulos válidos', () => {
    expect(ehModulo('simulador')).toBe(true)
    expect(ehModulo('admin')).toBe(false)
  })
})
