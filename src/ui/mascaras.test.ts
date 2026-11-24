import { describe, expect, it } from 'vitest'
import { mascararCnpj } from './mascaras'

describe('mascararCnpj', () => {
  it('formata enquanto digita', () => {
    expect(mascararCnpj('12')).toBe('12')
    expect(mascararCnpj('12345')).toBe('12.345')
    expect(mascararCnpj('12345678')).toBe('12.345.678')
    expect(mascararCnpj('123456780001')).toBe('12.345.678/0001')
    expect(mascararCnpj('12345678000199')).toBe('12.345.678/0001-99')
  })

  it('descarta letras e excesso de dígitos', () => {
    expect(mascararCnpj('ab12.345.678/0001-99999')).toBe('12.345.678/0001-99')
  })
})
