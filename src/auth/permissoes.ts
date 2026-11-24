import type { Perfil } from '../data/esquemas'

export const modulos = [
  'dashboard',
  'simulador',
  'comparador',
  'clientes',
  'propostas',
  'grupos',
  'configuracoes',
] as const
export type Modulo = (typeof modulos)[number]

const PERMISSOES: Record<Perfil, readonly Modulo[]> = {
  Administrador: modulos,
  Gestor: ['dashboard', 'simulador', 'comparador', 'clientes', 'propostas', 'grupos'],
  Vendedor: ['dashboard', 'simulador', 'comparador', 'clientes', 'propostas'],
}

export function podeAcessar(perfil: Perfil, modulo: Modulo): boolean {
  return PERMISSOES[perfil].includes(modulo)
}

export function modulosPermitidos(perfil: Perfil): readonly Modulo[] {
  return PERMISSOES[perfil]
}

export function ehModulo(valor: string): valor is Modulo {
  return (modulos as readonly string[]).includes(valor)
}
