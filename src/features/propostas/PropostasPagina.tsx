import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calculator } from 'lucide-react'
import { useAuth, useConfig } from '../../contexto'
import { statusProposta, type StatusProposta } from '../../data/esquemas'
import { ROTULO_STATUS, visiveis } from '../../data/operacoes'
import type { Repositorios } from '../../data/repositorios'
import { simularConsorcio } from '../../domain/consorcio'
import { formatarMoeda } from '../../domain/dinheiro'
import { CabecalhoPagina, Segmentado } from '../../ui/campos'
import { formatarData, useCarregar, useUsuarios } from '../../ui/dados'
import { Carregando, EtiquetaStatus } from '../../ui/etiquetas'

type Filtro = StatusProposta | 'todas'

const carregar = async (r: Repositorios) => {
  const [propostas, clientes] = await Promise.all([r.propostas.listar(), r.clientes.listar()])
  return { propostas, clientes }
}

export function PropostasPagina() {
  const { sessao } = useAuth()
  const { config } = useConfig()
  const usuarios = useUsuarios()
  const { dados } = useCarregar(carregar)
  const [filtro, setFiltro] = useState<Filtro>('todas')

  const linhas = useMemo(() => {
    if (!dados || !sessao) return []
    return visiveis(sessao, dados.propostas)
      .filter((p) => filtro === 'todas' || p.status === filtro)
      .sort((a, b) => b.criadaEm.localeCompare(a.criadaEm))
      .map((p) => ({
        ...p,
        cliente: dados.clientes.find((c) => c.id === p.clienteId)?.nome ?? '—',
        parcela: simularConsorcio(p.parametros).primeiraParcela,
      }))
  }, [dados, sessao, filtro])

  if (!sessao || !config) return null
  const mostraVendedor = sessao.perfil !== 'Vendedor'
  const nomeCategoria = (id: string) => config.categorias.find((c) => c.id === id)?.nome ?? id

  return (
    <section>
      <CabecalhoPagina
        titulo="Propostas"
        subtitulo="Propostas geradas a partir do simulador."
        acoes={
          <Link to="/simulador" className="btn btn-primario">
            <Calculator size={18} aria-hidden="true" />
            Nova simulação
          </Link>
        }
      />
      <div className="card barra-simples">
        <Segmentado
          rotulo="Status"
          valor={filtro}
          opcoes={[
            { valor: 'todas', rotulo: 'Todas' },
            ...statusProposta.map((s) => ({ valor: s, rotulo: ROTULO_STATUS[s] })),
          ]}
          aoMudar={setFiltro}
        />
      </div>
      {!dados ? (
        <Carregando />
      ) : (
        <div className="tabela-rolagem">
          <table className="tabela" aria-label="Propostas">
            <thead>
              <tr>
                <th scope="col">Número</th>
                <th scope="col">Cliente</th>
                <th scope="col">Categoria</th>
                <th scope="col" className="num">
                  Carta
                </th>
                <th scope="col" className="num">
                  Parcela
                </th>
                <th scope="col">Status</th>
                {mostraVendedor && <th scope="col">Vendedor</th>}
                <th scope="col">Criada</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/propostas/${p.id}`}>{p.numero}</Link>
                  </td>
                  <td>{p.cliente}</td>
                  <td>{nomeCategoria(p.categoriaId)}</td>
                  <td className="num">{formatarMoeda(p.parametros.carta)}</td>
                  <td className="num">{formatarMoeda(p.parcela)}</td>
                  <td>
                    <EtiquetaStatus status={p.status} />
                  </td>
                  {mostraVendedor && (
                    <td>{usuarios.find((u) => u.id === p.vendedorId)?.nome ?? '—'}</td>
                  )}
                  <td>{formatarData(p.criadaEm)}</td>
                </tr>
              ))}
              {linhas.length === 0 && (
                <tr>
                  <td colSpan={8} className="texto-secundario">
                    Nenhuma proposta encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
