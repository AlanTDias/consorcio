import type { ReactNode } from 'react'
import { HashRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { podeAcessar, type Modulo } from './auth/permissoes'
import { ProvedorConfig, ProvedorServicos, useAuth, useConfig, type Servicos } from './contexto'
import { ClienteFichaPagina } from './features/clientes/ClienteFichaPagina'
import { ClienteFormPagina } from './features/clientes/ClienteFormPagina'
import { ClientesPagina } from './features/clientes/ClientesPagina'
import { ComparadorPagina } from './features/comparador/ComparadorPagina'
import { ConfiguracoesPagina } from './features/configuracoes/ConfiguracoesPagina'
import { AcessoNegado, EmBreve } from './features/emBreve/EmBreve'
import { LoginPagina } from './features/login/LoginPagina'
import { NovaPropostaPagina } from './features/propostas/NovaPropostaPagina'
import { PropostaPagina } from './features/propostas/PropostaPagina'
import { PropostasPagina } from './features/propostas/PropostasPagina'
import { SimuladorPagina } from './features/simulador/SimuladorPagina'
import { Layout } from './ui/Layout'
import { NAVEGACAO } from './ui/navegacao'

const SUBROTAS: { modulo: Modulo; caminho: string; pagina: () => ReactNode }[] = [
  { modulo: 'clientes', caminho: '/clientes/novo', pagina: () => <ClienteFormPagina /> },
  { modulo: 'clientes', caminho: '/clientes/:id', pagina: () => <ClienteFichaPagina /> },
  { modulo: 'clientes', caminho: '/clientes/:id/editar', pagina: () => <ClienteFormPagina /> },
  { modulo: 'propostas', caminho: '/propostas/nova', pagina: () => <NovaPropostaPagina /> },
  { modulo: 'propostas', caminho: '/propostas/:id', pagina: () => <PropostaPagina /> },
]

const PAGINAS: Partial<Record<Modulo, () => ReactNode>> = {
  simulador: () => <SimuladorPagina />,
  comparador: () => <ComparadorPagina />,
  clientes: () => <ClientesPagina />,
  propostas: () => <PropostasPagina />,
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
          {SUBROTAS.map(({ modulo, caminho, pagina }) => (
            <Route
              key={caminho}
              path={caminho}
              element={<Permitido modulo={modulo}>{pagina()}</Permitido>}
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
