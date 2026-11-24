import { useCallback, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Check, FileDown, Send, X } from 'lucide-react'
import { podeAcessar } from '../../auth/permissoes'
import { useAuth, useConfig } from '../../contexto'
import type { StatusProposta } from '../../data/esquemas'
import { gruposComVaga } from '../../data/grupos'
import { ErroOperacao, mudarStatus, podeVer, proximosStatus } from '../../data/operacoes'
import type { Repositorios } from '../../data/repositorios'
import { simularConsorcio } from '../../domain/consorcio'
import { Aviso, CabecalhoPagina, CampoSelecao, type Mensagem } from '../../ui/campos'
import { formatarData, formatarDataHora, useCarregar, useUsuarios } from '../../ui/dados'
import { Carregando, EtiquetaStatus } from '../../ui/etiquetas'
import { AcessoNegado } from '../acesso/AcessoNegado'
import { ResultadoSimulacao, TabelaEvolucao } from '../simulador/ResultadoSimulacao'

const ACOES: Record<
  Exclude<StatusProposta, 'aberta'>,
  { rotulo: string; icone: typeof Check; classe: string }
> = {
  enviada: { rotulo: 'Marcar como enviada', icone: Send, classe: 'btn' },
  aceita: { rotulo: 'Registrar venda', icone: Check, classe: 'btn btn-primario' },
  recusada: { rotulo: 'Marcar como recusada', icone: X, classe: 'btn' },
}

export function PropostaPagina() {
  const { id = '' } = useParams()
  const carregar = useCallback(
    async (r: Repositorios) => {
      const proposta = await r.propostas.obter(id)
      const cliente = proposta ? await r.clientes.obter(proposta.clienteId) : undefined
      const [grupos, propostas] = await Promise.all([r.grupos.listar(), r.propostas.listar()])
      return { proposta, cliente, grupos, propostas }
    },
    [id],
  )
  const { dados, recarregar, repositorios } = useCarregar(carregar)
  const { sessao } = useAuth()
  const { config } = useConfig()
  const usuarios = useUsuarios()
  const [mensagem, setMensagem] = useState<Mensagem>(null)
  const [verEvolucao, setVerEvolucao] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [grupoEscolhido, setGrupoEscolhido] = useState<string | null>(null)

  const resultado = useMemo(
    () => (dados?.proposta ? simularConsorcio(dados.proposta.parametros) : null),
    [dados],
  )

  if (!dados || !sessao || !config) return <Carregando />
  const { proposta, cliente, grupos, propostas } = dados
  if (!proposta || !resultado) {
    return (
      <section className="card estado-vazio">
        <p>Proposta não encontrada.</p>
        <Link to="/propostas" className="btn">
          Voltar para propostas
        </Link>
      </section>
    )
  }
  if (!podeVer(sessao, proposta)) return <AcessoNegado />
  const comVaga = gruposComVaga(grupos, propostas, proposta.categoriaId)
  const sugerido = comVaga.some((g) => g.id === proposta.formulario.grupoId)
    ? proposta.formulario.grupoId
    : (comVaga[0]?.id ?? '')
  const grupoVenda = grupoEscolhido ?? sugerido
  const grupoAtual = grupos.find((g) => g.id === proposta.grupoId)
  const podeVerGrupos = podeAcessar(sessao.perfil, 'grupos')
  const vendedor = usuarios.find((u) => u.id === proposta.vendedorId)?.nome ?? '—'
  const categoria = config.categorias.find((c) => c.id === proposta.categoriaId)?.nome ?? ''

  async function alterar(status: StatusProposta) {
    if (!proposta) return
    try {
      await mudarStatus(
        repositorios,
        proposta,
        status,
        status === 'aceita' ? grupoVenda || null : proposta.grupoId,
      )
      setMensagem({ tipo: 'sucesso', texto: 'Status atualizado.' })
      recarregar()
    } catch (erro) {
      setMensagem({
        tipo: 'erro',
        texto: erro instanceof ErroOperacao ? erro.message : 'Não foi possível atualizar.',
      })
    }
  }

  async function exportarPdf() {
    if (!proposta || !resultado || !config) return
    setGerando(true)
    try {
      const { gerarPdfProposta, nomeArquivoPdf } = await import('./pdf')
      gerarPdfProposta({ proposta, cliente, vendedor, config, resultado }).save(
        nomeArquivoPdf(proposta),
      )
    } finally {
      setGerando(false)
    }
  }

  return (
    <section>
      <Link to="/propostas" className="link-voltar">
        <ArrowLeft size={16} aria-hidden="true" />
        Propostas
      </Link>
      <CabecalhoPagina
        titulo={`Proposta ${proposta.numero}`}
        subtitulo={`${categoria} · criada em ${formatarData(proposta.criadaEm)} · ${vendedor}`}
        acoes={
          <button type="button" className="btn" onClick={exportarPdf} disabled={gerando}>
            <FileDown size={18} aria-hidden="true" />
            {gerando ? 'Gerando…' : 'Exportar PDF'}
          </button>
        }
      />
      {mensagem && <Aviso mensagem={mensagem} />}

      <div className="ficha">
        <section className="card pilha-sm">
          <h2>Simulação</h2>
          <ResultadoSimulacao parametros={proposta.parametros} resultado={resultado} />
        </section>

        <div className="pilha">
          <section className="card pilha-sm">
            <h2>Status</h2>
            <div className="status-atual">
              <EtiquetaStatus status={proposta.status} />
              {proposta.fechadaEm && (
                <span className="texto-secundario">em {formatarDataHora(proposta.fechadaEm)}</span>
              )}
            </div>
            {grupoAtual && (
              <p>
                Grupo{' '}
                {podeVerGrupos ? (
                  <Link to={`/grupos/${grupoAtual.id}`}>{grupoAtual.codigo}</Link>
                ) : (
                  grupoAtual.codigo
                )}
              </p>
            )}
            {proximosStatus(proposta.status).includes('aceita') && (
              <CampoSelecao
                rotulo="Grupo da venda"
                valor={grupoVenda}
                opcoes={[
                  { valor: '', rotulo: 'Definir depois' },
                  ...comVaga.map((g) => ({
                    valor: g.id,
                    rotulo: `Grupo ${g.codigo} (${g.prazoMeses} meses)`,
                  })),
                ]}
                aoMudar={setGrupoEscolhido}
              />
            )}
            {proximosStatus(proposta.status).length > 0 ? (
              <div className="acoes">
                {proximosStatus(proposta.status).map((s) => {
                  if (s === 'aberta') return null
                  const { rotulo, icone: Icone, classe } = ACOES[s]
                  return (
                    <button key={s} type="button" className={classe} onClick={() => alterar(s)}>
                      <Icone size={18} aria-hidden="true" />
                      {rotulo}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="texto-secundario">Proposta encerrada.</p>
            )}
          </section>

          <section className="card pilha-sm">
            <h2>Cliente</h2>
            {cliente ? (
              <dl className="lista-detalhe">
                <div>
                  <dt>Nome</dt>
                  <dd>
                    <Link to={`/clientes/${cliente.id}`}>{cliente.nome}</Link>
                  </dd>
                </div>
                <div>
                  <dt>Telefone</dt>
                  <dd>{cliente.telefone || '—'}</dd>
                </div>
                <div>
                  <dt>E-mail</dt>
                  <dd className="quebra">{cliente.email || '—'}</dd>
                </div>
              </dl>
            ) : (
              <p className="texto-secundario">Cliente não encontrado.</p>
            )}
          </section>

          {proposta.observacoes && (
            <section className="card pilha-sm">
              <h2>Observações</h2>
              <p className="anotacao">{proposta.observacoes}</p>
            </section>
          )}
        </div>
      </div>

      <section className="card pilha-sm evolucao">
        <div className="evolucao-topo">
          <h2>Evolução mês a mês</h2>
          <button
            type="button"
            className="btn btn-pequeno"
            aria-expanded={verEvolucao}
            onClick={() => setVerEvolucao((v) => !v)}
          >
            {verEvolucao ? 'Ocultar tabela' : `Ver ${resultado.prazoEfetivo} meses`}
          </button>
        </div>
        {verEvolucao && <TabelaEvolucao resultado={resultado} />}
      </section>
    </section>
  )
}
