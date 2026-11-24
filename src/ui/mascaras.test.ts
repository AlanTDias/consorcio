import { describe, expect, it } from 'vitest'
import { mascararCnpj, mascararCpf, mascararTelefone } from './mascaras'

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

describe('mascararCpf', () => {
  it('formata o CPF', () => {
    expect(mascararCpf('000000001')).toBe('000.000.001')
    expect(mascararCpf('00000000100')).toBe('000.000.001-00')
    expect(mascararCpf('000.000.001-0012')).toBe('000.000.001-00')
  })
})

describe('mascararTelefone', () => {
  it('formata fixo e celular', () => {
    expect(mascararTelefone('11')).toBe('(11')
    expect(mascararTelefone('1130000000')).toBe('(11) 3000-0000')
    expect(mascararTelefone('11900000001')).toBe('(11) 90000-0001')
    expect(mascararTelefone('')).toBe('')
  })
})
