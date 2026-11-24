import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { FlaskConical, LogOut, Menu, X } from 'lucide-react'
import { podeAcessar } from '../auth/permissoes'
import { useAuth } from '../contexto'
import { AvisoLegal } from './AvisoLegal'
import { Logo } from './Logo'
import { NAVEGACAO } from './navegacao'
import './layout.css'

export function Layout({ nomeSistema }: { nomeSistema: string }) {
  const { sessao, sair } = useAuth()
  const navegar = useNavigate()
  const [menuAberto, setMenuAberto] = useState(false)

  if (!sessao) return null

  const itens = NAVEGACAO.filter((item) => podeAcessar(sessao.perfil, item.modulo))

  async function aoSair() {
    await sair()
    navegar('/login', { replace: true })
  }

  return (
    <div className="app" data-menu-aberto={menuAberto}>
      <aside className="lateral" id="menu-lateral">
        <div className="lateral-topo">
          <Logo nome={nomeSistema} />
          <button
            type="button"
            className="btn btn-icone so-movel"
            aria-label="Fechar menu"
            onClick={() => setMenuAberto(false)}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <nav aria-label="Principal">
          <ul className="menu">
            {itens.map(({ modulo, rotulo, icone: Icone }) => (
              <li key={modulo}>
                <NavLink
                  to={`/${modulo}`}
                  className="menu-item"
                  onClick={() => setMenuAberto(false)}
                >
                  <Icone size={18} aria-hidden="true" />
                  {rotulo}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <div className="fundo-menu" aria-hidden="true" onClick={() => setMenuAberto(false)} />

      <div className="principal">
        <header className="topo">
          <button
            type="button"
            className="btn btn-icone so-movel"
            aria-label="Abrir menu"
            aria-controls="menu-lateral"
            aria-expanded={menuAberto}
            onClick={() => setMenuAberto(true)}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          <span className="selo-demo" title="Login de demonstração: não é autenticação real">
            <FlaskConical size={14} aria-hidden="true" />
            Demonstração
          </span>
          <div className="topo-usuario">
            <div className="topo-identidade">
              <strong data-testid="usuario-nome">{sessao.nome}</strong>
              <span className="texto-secundario" data-testid="usuario-perfil">
                {sessao.perfil}
              </span>
            </div>
            <button type="button" className="btn" aria-label="Sair" onClick={aoSair}>
              <LogOut size={18} aria-hidden="true" />
              <span className="some-movel">Sair</span>
            </button>
          </div>
        </header>
        <main className="conteudo">
          <Outlet />
        </main>
        <footer className="rodape">
          <AvisoLegal />
        </footer>
      </div>
    </div>
  )
}
