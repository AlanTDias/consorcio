import type { ReactNode } from 'react'
import { HashRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { podeAcessar, type Modulo } from './auth/permissoes'
import { ProvedorConfig, ProvedorServicos, useAuth, useConfig, type Servicos } from './contexto'
import { ComparadorPagina } from './features/comparador/ComparadorPagina'
import { ConfiguracoesPagina } from './features/configuracoes/ConfiguracoesPagina'
import { AcessoNegado, EmBreve } from './features/emBreve/EmBreve'
import { LoginPagina } from './features/login/LoginPagina'
import { SimuladorPagina } from './features/simulador/SimuladorPagina'
import { Layout } from './ui/Layout'
import { NAVEGACAO } from './ui/navegacao'

const PAGINAS: Partial<Record<Modulo, () => ReactNode>> = {
  simulador: () => <SimuladorPagina />,
  comparador: () => <ComparadorPagina />,
  configuracoes: () => <ConfiguracoesPagina />,
}

function RotaProtegida() {
  const { sessao, carregando } = useAuth()
  const local = useLocation()
  if (carregando) return null
  if (!sessao) return <Navigate to="/login" replace state={{ de: local.pathname }} />
  return <Outlet />
}

function Permitido({ modulo, children }: { modulo: Modulo; children: ReactNode }) {
  const { sessao } = useAuth()
  if (!sessao || !podeAcessar(sessao.perfil, modulo)) return <AcessoNegado />
  return children
}

function Rotas() {
  const { carregando } = useAuth()
  const { config } = useConfig()
  if (carregando || !config) return null
  const nome = config.empresa.nomeSistema

  return (
    <Routes>
      <Route path="/login" element={<LoginPagina nomeSistema={nome} />} />
      <Route element={<RotaProtegida />}>
        <Route element={<Layout nomeSistema={nome} />}>
          {NAVEGACAO.map(({ modulo, rotulo, etapa }) => (
            <Route
              key={modulo}
              path={`/${modulo}`}
              element={
                <Permitido modulo={modulo}>
                  {PAGINAS[modulo]?.() ?? <EmBreve titulo={rotulo} etapa={etapa} />}
                </Permitido>
              }
            />
          ))}
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export function App({ servicos }: { servicos: Servicos }) {
  return (
    <ProvedorServicos servicos={servicos}>
      <ProvedorConfig>
        <HashRouter>
          <Rotas />
        </HashRouter>
      </ProvedorConfig>
    </ProvedorServicos>
  )
}
