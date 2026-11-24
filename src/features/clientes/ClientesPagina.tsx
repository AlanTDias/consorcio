import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Search, UserPlus } from 'lucide-react'
import { useAuth, useConfig } from '../../contexto'
import { etapasFunil, type Cliente, type EtapaFunil } from '../../data/esquemas'
import { mudarEtapa, ROTULO_ETAPA, visiveis } from '../../data/operacoes'
import type { Repositorios } from '../../data/repositorios'
import { CabecalhoPagina, Segmentado } from '../../ui/campos'
import { formatarData, useCarregar, useUsuarios } from '../../ui/dados'
import { Carregando, EtiquetaEtapa } from '../../ui/etiquetas'
import './clientes.css'

type Visao = 'lista' | 'funil'
type FiltroEtapa = EtapaFunil | 'todas'

const listarClientes = (r: Repositorios) => r.clientes.listar()

function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function ClientesPagina() {
  const { sessao } = useAuth()
  const { config } = useConfig()
  const usuarios = useUsuarios()
  const { dados, recarregar, repositorios } = useCarregar(listarClientes)
  const [visao, setVisao] = useState<Visao>('lista')
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<FiltroEtapa>('todas')

  const clientes = useMemo(() => {
    if (!dados || !sessao) return []
    const termo = normalizar(busca.trim())
    return visiveis(sessao, dados)
      .filter((c) => filtro === 'todas' || c.etapa === filtro)
      .filter(
        (c) =>
          !termo ||
          normalizar(c.nome).includes(termo) ||
          c.telefone.includes(termo) ||
          c.email.includes(termo),
      )
      .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm))
  }, [dados, sessao, busca, filtro])

  if (!sessao || !config) return null
  const nomeCategoria = (id: string) => config.categorias.find((c) => c.id === id)?.nome ?? id
  const nomeUsuario = (id: string) => usuarios.find((u) => u.id === id)?.nome ?? '—'
  const mostraVendedor = sessao.perfil !== 'Vendedor'

  async function mover(cliente: Cliente, etapa: EtapaFunil) {
    await mudarEtapa(repositorios, cliente, etapa)
    recarregar()
  }

  return (
    <section>
      <CabecalhoPagina
        titulo="Clientes"
        subtitulo={
          mostraVendedor ? 'Todos os clientes da equipe.' : 'Seus clientes e o funil de vendas.'
        }
        acoes={
          <Link to="/clientes/novo" className="btn btn-primario">
            <UserPlus size={18} aria-hidden="true" />
            Novo cliente
          </Link>
        }
      />

      <div className="card barra-filtros">
        <Segmentado
          rotulo="Visualização"
          valor={visao}
          opcoes={[
            { valor: 'lista', rotulo: 'Lista' },
            { valor: 'funil', rotulo: 'Funil' },
          ]}
          aoMudar={setVisao}
        />
        <div className="campo">
          <label htmlFor="busca-clientes">Buscar</label>
          <div className="campo-entrada">
            <Search className="icone-campo" size={18} aria-hidden="true" />
            <input
              id="busca-clientes"
              className="entrada"
              type="search"
              placeholder="Nome, telefone ou e-mail"
              value={busca}
              maxLength={80}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>
        {visao === 'lista' && (
          <Segmentado
            rotulo="Etapa"
            valor={filtro}
            opcoes={[
              { valor: 'todas', rotulo: 'Todas' },
              ...etapasFunil.map((e) => ({ valor: e, rotulo: ROTULO_ETAPA[e] })),
            ]}
            aoMudar={setFiltro}
          />
        )}
      </div>

      {!dados ? (
        <Carregando />
      ) : visao === 'lista' ? (
        <div className="tabela-rolagem">
          <table className="tabela" aria-label="Clientes">
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">Telefone</th>
                <th scope="col">Interesse</th>
                <th scope="col">Etapa</th>
                {mostraVendedor && <th scope="col">Vendedor</th>}
                <th scope="col">Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/clientes/${c.id}`}>{c.nome}</Link>
                  </td>
                  <td>{c.telefone || '—'}</td>
                  <td>{nomeCategoria(c.categoriaInteresse)}</td>
                  <td>
                    <EtiquetaEtapa etapa={c.etapa} />
                  </td>
                  {mostraVendedor && <td>{nomeUsuario(c.vendedorId)}</td>}
                  <td>{formatarData(c.atualizadoEm)}</td>
                </tr>
              ))}
              {clientes.length === 0 && (
                <tr>
                  <td colSpan={6} className="texto-secundario">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="funil">
          {etapasFunil.map((etapa, i) => {
            const daEtapa = clientes.filter((c) => c.etapa === etapa)
            const anterior = etapasFunil[i - 1]
            const proxima = etapasFunil[i + 1]
            return (
              <section key={etapa} className="funil-coluna" aria-label={ROTULO_ETAPA[etapa]}>
                <header>
                  <h2>{ROTULO_ETAPA[etapa]}</h2>
                  <span className="etiqueta">{daEtapa.length}</span>
                </header>
                <ul>
                  {daEtapa.map((c) => (
                    <li key={c.id} className="funil-cartao">
                      <Link to={`/clientes/${c.id}`}>{c.nome}</Link>
                      <span className="texto-secundario">
                        {nomeCategoria(c.categoriaInteresse)}
                        {mostraVendedor ? ` · ${nomeUsuario(c.vendedorId)}` : ''}
                      </span>
                      <div className="funil-acoes">
                        {anterior && (
                          <button
                            type="button"
                            className="btn btn-pequeno"
                            onClick={() => mover(c, anterior)}
                            aria-label={`Voltar ${c.nome} para ${ROTULO_ETAPA[anterior]}`}
                          >
                            <ChevronLeft size={16} aria-hidden="true" />
                            {ROTULO_ETAPA[anterior]}
                          </button>
                        )}
                        {proxima && (
                          <button
                            type="button"
                            className="btn btn-pequeno"
                            onClick={() => mover(c, proxima)}
                            aria-label={`Avançar ${c.nome} para ${ROTULO_ETAPA[proxima]}`}
                          >
                            {ROTULO_ETAPA[proxima]}
                            <ChevronRight size={16} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                  {daEtapa.length === 0 && <li className="texto-secundario">Nenhum cliente.</li>}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </section>
  )
}
