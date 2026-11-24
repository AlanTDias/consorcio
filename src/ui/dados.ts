import { useCallback, useEffect, useState } from 'react'
import { useServicos } from '../contexto'
import type { Usuario } from '../data/esquemas'
import type { Repositorios } from '../data/repositorios'

export function useCarregar<T>(carregar: (repos: Repositorios) => Promise<T>) {
  const { repositorios } = useServicos()
  const [dados, setDados] = useState<T | undefined>(undefined)
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    let ativo = true
    carregar(repositorios).then((resultado) => {
      if (ativo) setDados(resultado)
    })
    return () => {
      ativo = false
    }
  }, [repositorios, carregar, versao])

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])
  return { dados, recarregar, repositorios }
}

const listarUsuarios = (r: Repositorios) => r.usuarios.listar()

export function useUsuarios(): Usuario[] {
  return useCarregar(listarUsuarios).dados ?? []
}

const formatoData = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })
const formatoDataHora = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

export function formatarData(iso: string): string {
  return formatoData.format(new Date(iso))
}

export function formatarDataHora(iso: string): string {
  return formatoDataHora.format(new Date(iso))
}
