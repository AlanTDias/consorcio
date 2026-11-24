import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import './estilos/global.css'
import { App } from './App'
import { DemoAuthService } from './auth/DemoAuthService'
import { armazenamentoNavegador } from './data/armazenamento'
import { criarRepositoriosLocais } from './data/local/repositoriosLocais'

const local = armazenamentoNavegador('local')
const repositorios = criarRepositoriosLocais(local)
const auth = new DemoAuthService(repositorios.usuarios, local, armazenamentoNavegador('sessao'))

const raiz = document.getElementById('root')
if (!raiz) throw new Error('Elemento #root não encontrado')

createRoot(raiz).render(
  <StrictMode>
    <App servicos={{ repositorios, auth }} />
  </StrictMode>,
)
