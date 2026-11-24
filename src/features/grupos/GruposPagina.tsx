import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useConfig } from '../../contexto'
import { ocupacao, ROTULO_STATUS_GRUPO } from '../../data/grupos'
import type { Repositorios } from '../../data/repositorios'
import { formatarPct } from '../../domain/dinheiro'
import { CabecalhoPagina } from '../../ui/campos'
import { formatarData, useCarregar } from '../../ui/dados'
import { Carregando } from '../../ui/etiquetas'
import './grupos.css'

const carregar = async (r: Repositorios) => {
  const [grupos, propostas] = await Promise.all([r.grupos.listar(), r.propostas.listar()])
  return { grupos, propostas }
}

const ORDEM = { andamento: 0, formacao: 1, encerrado: 2 } as const

export function GruposPagina() {
  const { config } = useConfig()
  const { dados } = useCarregar(carregar)

  const linhas = useMemo(
    () =>
      dados
        ? [...dados.grupos]
            .sort((a, b) => ORDEM[a.status] - ORDEM[b.status] || a.codigo.localeCompare(b.codigo))
            .map((g) => ({ ...g, ocupacao: ocupacao(g, dados.propostas) }))
        : [],
    [dados],
  )

  if (!config) return null
  const nomeCategoria = (id: string) => config.categorias.find((c) => c.id === id)?.nome ?? id

  return (
    <section>
      <CabecalhoPagina
        titulo="Grupos e cotas"
        subtitulo="Ocupação dos grupos, cotas disponíveis e assembleias."
        acoes={
          <Link to="/grupos/novo" className="btn btn-primario">
            <Plus size={18} aria-hidden="true" />
            Novo grupo
          </Link>
        }
      />
      {!dados ? (
        <Carregando />
      ) : (
        <div className="grade-grupos">
          {linhas.map((g) => (
            <article key={g.id} className="card grupo-cartao" data-status={g.status}>
              <header>
                <h2>
                  <Link to={`/grupos/${g.id}`}>Grupo {g.codigo}</Link>
                </h2>
                <span className={`etiqueta${g.status === 'andamento' ? ' etiqueta-ativa' : ''}`}>
                  {ROTULO_STATUS_GRUPO[g.status]}
                </span>
              </header>
              <p className="texto-secundario">
                {nomeCategoria(g.categoriaId)} · {g.prazoMeses} meses · lance fixo{' '}
                {formatarPct(g.lanceFixoPct, 0)}
              </p>
              <div className="ocupacao">
                <div className="lista-barras-texto">
                  <span>
                    {g.ocupacao.ocupadas} de {g.participantes} cotas
                  </span>
                  <strong>{formatarPct(g.ocupacao.pct, 1)}</strong>
                </div>
                <div className="barra-trilho" aria-hidden="true">
                  <div className="barra-preenchida" style={{ width: `${g.ocupacao.pct}%` }} />
                </div>
              </div>
              <dl className="lista-detalhe">
                <div>
                  <dt>Cotas disponíveis</dt>
                  <dd data-testid={`disponiveis-${g.codigo}`}>{g.ocupacao.disponiveis}</dd>
                </div>
                <div>
                  <dt>Assembleias</dt>
                  <dd>{g.assembleias.length}</dd>
                </div>
                <div>
                  <dt>Início</dt>
                  <dd>{formatarData(g.inicio)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
