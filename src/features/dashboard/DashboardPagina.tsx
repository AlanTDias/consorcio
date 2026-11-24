import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calculator, CircleCheck } from 'lucide-react'
import { useAuth, useConfig } from '../../contexto'
import type { Repositorios } from '../../data/repositorios'
import { formatarMoeda, formatarNumero, formatarPct } from '../../domain/dinheiro'
import { CabecalhoPagina, Segmentado } from '../../ui/campos'
import { useCarregar, useUsuarios } from '../../ui/dados'
import { Carregando } from '../../ui/etiquetas'
import { calcularIndicadores, periodoDoMes } from './indicadores'
import './dashboard.css'

const listarPropostas = (r: Repositorios) => r.propostas.listar()
const nomeMes = new Intl.DateTimeFormat('pt-BR', { month: 'long' })
const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const cotas = (n: number) => `${n} ${n === 1 ? 'cota' : 'cotas'}`

function Barra({ valor, maximo, rotulo }: { valor: number; maximo: number; rotulo: string }) {
  const largura = maximo > 0 ? Math.max((valor / maximo) * 100, valor > 0 ? 2 : 0) : 0
  return (
    <div className="barra-trilho" title={rotulo} aria-hidden="true">
      <div className="barra-preenchida" style={{ width: `${largura}%` }} />
    </div>
  )
}

export function DashboardPagina() {
  const { sessao } = useAuth()
  const { config } = useConfig()
  const usuarios = useUsuarios()
  const { dados: propostas } = useCarregar(listarPropostas)
  const [deslocamento, setDeslocamento] = useState<'0' | '-1'>('0')
  const [agora] = useState(() => new Date())

  const periodo = useMemo(() => periodoDoMes(agora, Number(deslocamento)), [agora, deslocamento])
  const indicadores = useMemo(
    () =>
      sessao && config && propostas
        ? calcularIndicadores({ sessao, propostas, usuarios, config, periodo })
        : null,
    [sessao, config, propostas, usuarios, periodo],
  )

  if (!sessao || !config) return null
  const equipe = sessao.perfil !== 'Vendedor'
  const mesAtual = capitalizar(nomeMes.format(periodoDoMes(agora, 0).inicio))
  const mesAnterior = capitalizar(nomeMes.format(periodoDoMes(agora, -1).inicio))

  return (
    <section>
      <CabecalhoPagina
        titulo={`Olá, ${sessao.nome.split(' ')[0]}`}
        subtitulo={equipe ? 'Resultados da equipe.' : 'Seus resultados e o ranking da equipe.'}
        acoes={
          <Link to="/simulador" className="btn btn-primario">
            <Calculator size={18} aria-hidden="true" />
            Nova simulação
          </Link>
        }
      />
      <div className="card barra-simples">
        <Segmentado
          rotulo="Período"
          valor={deslocamento}
          opcoes={[
            { valor: '0', rotulo: mesAtual },
            { valor: '-1', rotulo: mesAnterior },
          ]}
          aoMudar={setDeslocamento}
        />
      </div>

      {!indicadores ? (
        <Carregando />
      ) : (
        <div className="pilha">
          <div className="indicadores" data-testid="kpis">
            <div className="indicador">
              <span className="indicador-rotulo">Vendas no mês</span>
              <span className="indicador-valor" data-testid="kpi-vendas">
                {cotas(indicadores.vendas)}
              </span>
            </div>
            <div className="indicador">
              <span className="indicador-rotulo">Volume em cartas</span>
              <span className="indicador-valor" data-testid="kpi-volume">
                {formatarMoeda(indicadores.volume)}
              </span>
            </div>
            <div className="indicador">
              <span className="indicador-rotulo">Ticket médio</span>
              <span className="indicador-valor">{formatarMoeda(indicadores.ticketMedio)}</span>
            </div>
            <div className="indicador">
              <span className="indicador-rotulo">Propostas em aberto</span>
              <span className="indicador-valor" data-testid="kpi-abertas">
                {formatarNumero(indicadores.emAberto)}
              </span>
              <span className="indicador-nota">
                {formatarMoeda(indicadores.volumeEmAberto)} em cartas
              </span>
            </div>
          </div>

          <div className="painel">
            <section className="card pilha-sm" aria-labelledby="t-categorias">
              <h2 id="t-categorias">Cotas vendidas por categoria</h2>
              <ul className="lista-barras">
                {indicadores.porCategoria.map((c) => {
                  const maximo = Math.max(...indicadores.porCategoria.map((x) => x.cotas))
                  return (
                    <li key={c.categoriaId}>
                      <div className="lista-barras-texto">
                        <span>{c.nome}</span>
                        <strong>{cotas(c.cotas)}</strong>
                      </div>
                      <Barra
                        valor={c.cotas}
                        maximo={maximo}
                        rotulo={`${c.nome}: ${cotas(c.cotas)}, ${formatarMoeda(c.volume)}`}
                      />
                      <span className="texto-secundario">{formatarMoeda(c.volume)}</span>
                    </li>
                  )
                })}
              </ul>
            </section>

            <section className="card pilha-sm" aria-labelledby="t-ranking">
              <h2 id="t-ranking">Ranking de vendedores</h2>
              <ol className="lista-barras ranking">
                {indicadores.ranking.map((l, i) => {
                  const maximo = indicadores.ranking[0]?.volume ?? 0
                  return (
                    <li key={l.vendedorId} data-eu={l.vendedorId === sessao.usuarioId}>
                      <div className="lista-barras-texto">
                        <span>
                          {i + 1}º {l.nome}
                        </span>
                        <strong>{formatarMoeda(l.volume)}</strong>
                      </div>
                      <Barra
                        valor={l.volume}
                        maximo={maximo}
                        rotulo={`${l.nome}: ${formatarMoeda(l.volume)}`}
                      />
                      <span className="texto-secundario">{cotas(l.cotas)}</span>
                    </li>
                  )
                })}
              </ol>
            </section>

            <section className="card pilha-sm" aria-labelledby="t-metas">
              <h2 id="t-metas">Metas do mês</h2>
              <ul className="lista-barras">
                {indicadores.metas.map((m) => (
                  <li key={m.vendedorId} data-testid={`meta-${m.vendedorId}`}>
                    <div className="lista-barras-texto">
                      <span>{m.nome}</span>
                      <strong>{m.meta ? formatarPct(m.pct, 1) : 'sem meta'}</strong>
                    </div>
                    <Barra
                      valor={Math.min(m.volume, m.meta)}
                      maximo={m.meta}
                      rotulo={`${m.nome}: ${formatarMoeda(m.volume)} de ${formatarMoeda(m.meta)}`}
                    />
                    <span className="texto-secundario meta-rodape">
                      {formatarMoeda(m.volume)} de {formatarMoeda(m.meta)}
                      {m.meta > 0 && m.volume >= m.meta && (
                        <span className="etiqueta etiqueta-sucesso">
                          <CircleCheck size={14} aria-hidden="true" />
                          Meta atingida
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}
    </section>
  )
}
