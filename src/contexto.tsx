import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { AuthService, Credenciais, Sessao } from './auth/AuthService'
import type { Config } from './data/esquemas'
import type { Repositorios } from './data/repositorios'

export interface Servicos {
  repositorios: Repositorios
  auth: AuthService
}

interface EstadoAuth {
  sessao: Sessao | null
  carregando: boolean
  entrar(credenciais: Credenciais): Promise<Sessao>
  sair(): Promise<void>
}

const ServicosContexto = createContext<Servicos | null>(null)
const AuthContexto = createContext<EstadoAuth | null>(null)

export function ProvedorServicos({
  servicos,
  children,
}: {
  servicos: Servicos
  children: ReactNode
}) {
  const [sessao, setSessao] = useState<Sessao | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true
    servicos.auth.restaurarSessao().then((s) => {
      if (!ativo) return
      setSessao(s)
      setCarregando(false)
    })
    return () => {
      ativo = false
    }
  }, [servicos])

  const entrar = useCallback(
    async (credenciais: Credenciais) => {
      const nova = await servicos.auth.entrar(credenciais)
      setSessao(nova)
      return nova
    },
    [servicos],
  )

  const sair = useCallback(async () => {
    await servicos.auth.sair()
    setSessao(null)
  }, [servicos])

  const auth = useMemo(
    () => ({ sessao, carregando, entrar, sair }),
    [sessao, carregando, entrar, sair],
  )

  return (
    <ServicosContexto.Provider value={servicos}>
      <AuthContexto.Provider value={auth}>{children}</AuthContexto.Provider>
    </ServicosContexto.Provider>
  )
}

interface EstadoConfig {
  config: Config | null
  recarregar(): Promise<void>
}

const ConfigContexto = createContext<EstadoConfig | null>(null)

export function ProvedorConfig({ children }: { children: ReactNode }) {
  const { repositorios } = useServicos()
  const [config, setConfig] = useState<Config | null>(null)

  const recarregar = useCallback(async () => {
    setConfig(await repositorios.config.obter())
  }, [repositorios])

  useEffect(() => {
    let ativo = true
    repositorios.config.obter().then((c) => {
      if (ativo) setConfig(c)
    })
    return () => {
      ativo = false
    }
  }, [repositorios])

  const valor = useMemo(() => ({ config, recarregar }), [config, recarregar])
  return <ConfigContexto.Provider value={valor}>{children}</ConfigContexto.Provider>
}

export function useConfig(): EstadoConfig {
  const valor = useContext(ConfigContexto)
  if (!valor) throw new Error('useConfig fora do ProvedorConfig')
  return valor
}

export function useServicos(): Servicos {
  const valor = useContext(ServicosContexto)
  if (!valor) throw new Error('useServicos fora do ProvedorServicos')
  return valor
}

export function useAuth(): EstadoAuth {
  const valor = useContext(AuthContexto)
  if (!valor) throw new Error('useAuth fora do ProvedorServicos')
  return valor
}
