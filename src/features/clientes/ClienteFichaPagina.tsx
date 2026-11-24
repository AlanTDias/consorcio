import { useCallback, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Calculator, Pencil, Send } from 'lucide-react'
import { useAuth, useConfig } from '../../contexto'
import { etapasFunil, type EtapaFunil } from '../../data/esquemas'
import { anotar, mudarEtapa, podeVer, ROTULO_ETAPA } from '../../data/operacoes'
import type { Repositorios } from '../../data/repositorios'
import { simularConsorcio } from '../../domain/consorcio'
import { formatarMoeda } from '../../domain/dinheiro'
import { CabecalhoPagina, CampoSelecao, CampoTexto } from '../../ui/campos'
import { formatarData, formatarDataHora, useCarregar, useUsuarios } from '../../ui/dados'
import { Carregando, EtiquetaEtapa, EtiquetaStatus } from '../../ui/etiquetas'
import { AcessoNegado } from '../emBreve/EmBreve'
import { NaoEncontrado } from './ClienteFormPagina'

export function ClienteFichaPagina() {
  const { id = '' } = useParams()
  const carregar = useCallback(
    async (r: Repositorios) => {
      const [cliente, propostas] = await Promise.all([r.clientes.obter(id), r.propostas.listar()])
      return { cliente, propostas: propostas.filter((p) => p.clienteId === id) }
    },
    [id],
  )
  const { dados, recarregar, repositorios } = useCarregar(carregar)
  const { sessao } = useAuth()
  const { config } = useConfig()
  const usuarios = useUsuarios()
  const [nota, setNota] = useState('')
  const [erroNota, setErroNota] = useState('')

  if (!dados || !sessao || !config) return <Carregando />
  const { cliente, propostas } = dados
  if (!cliente) return <NaoEncontrado />
  if (!podeVer(sessao, cliente)) return <AcessoNegado />

  const nomeUsuario = (uid: string) => usuarios.find((u) => u.id === uid)?.nome ?? '—'
  const categoria = config.categorias.find((c) => c.id === cliente.categoriaInteresse)

  async function trocarEtapa(etapa: EtapaFunil) {
    if (!cliente) return
    await mudarEtapa(repositorios, cliente, etapa)
    recarregar()
  }

  async function adicionarNota(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!cliente || !sessao) return
    if (!nota.trim()) {
      setErroNota('Escreva a anotação.')
      return
    }
    await anotar(repositorios, cliente, sessao.usuarioId, nota)
    setNota('')
    setErroNota('')
    recarregar()
  }

  return (
    <section>
      <Link to="/clientes" className="link-voltar">
        <ArrowLeft size={16} aria-hidden="true" />
        Clientes
      </Link>
      <CabecalhoPagina
        titulo={cliente.nome}
        subtitulo={`Cliente desde ${formatarData(cliente.criadoEm)} · ${nomeUsuario(cliente.vendedorId)}`}
        acoes={
          <>
            <Link to={`/clientes/${cliente.id}/editar`} className="btn">
              <Pencil size={18} aria-hidden="true" />
              Editar
            </Link>
            <Link to="/simulador" state={{ clienteId: cliente.id }} className="btn btn-primario">
              <Calculator size={18} aria-hidden="true" />
              Simular para este cliente
            </Link>
          </>
        }
      />

      <div className="ficha">
        <div className="pilha">
          <section className="card pilha-sm">
            <h2>Propostas</h2>
            {propostas.length === 0 ? (
              <p className="texto-secundario">Nenhuma proposta ainda.</p>
            ) : (
              <div className="tabela-rolagem">
                <table className="tabela" aria-label="Propostas do cliente">
                  <thead>
                    <tr>
                      <th scope="col">Número</th>
                      <th scope="col" className="num">
                        Carta
                      </th>
                      <th scope="col" className="num">
                        Parcela
                      </th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {propostas.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <Link to={`/propostas/${p.id}`}>{p.numero}</Link>
                        </td>
                        <td className="num">{formatarMoeda(p.parametros.carta)}</td>
                        <td className="num">
                          {formatarMoeda(simularConsorcio(p.parametros).primeiraParcela)}
                        </td>
                        <td>
                          <EtiquetaStatus status={p.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card pilha-sm">
            <h2>Anotações</h2>
            <form className="pilha-sm" onSubmit={adicionarNota} noValidate>
              <CampoTexto
                rotulo="Nova anotação"
                multilinha
                maximo={1000}
                valor={nota}
                aoMudar={setNota}
                erro={erroNota}
              />
              <div>
                <button type="submit" className="btn">
                  <Send size={18} aria-hidden="true" />
                  Adicionar anotação
                </button>
              </div>
            </form>
            {[...cliente.anotacoes].reverse().map((a) => (
              <article key={a.id} className="anotacao">
                <p>{a.texto}</p>
                <footer>
                  {nomeUsuario(a.autorId)} · {formatarDataHora(a.data)}
                </footer>
              </article>
            ))}
          </section>
        </div>

        <div className="pilha">
          <section className="card pilha-sm">
            <h2>Dados</h2>
            <dl className="lista-detalhe">
              <div>
                <dt>Etapa</dt>
                <dd>
                  <EtiquetaEtapa etapa={cliente.etapa} />
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
              <div>
                <dt>CPF</dt>
                <dd>{cliente.cpf || '—'}</dd>
              </div>
              <div>
                <dt>Interesse</dt>
                <dd>{categoria?.nome ?? cliente.categoriaInteresse}</dd>
              </div>
            </dl>
            <CampoSelecao
              rotulo="Mover no funil"
              valor={cliente.etapa}
              opcoes={etapasFunil.map((e) => ({ valor: e, rotulo: ROTULO_ETAPA[e] }))}
              aoMudar={trocarEtapa}
            />
          </section>

          <section className="card pilha-sm">
            <h2>Histórico</h2>
            <ol className="linha-tempo">
              {[...cliente.historico].reverse().map((h) => (
                <li key={h.id}>
                  <span>{h.descricao}</span>
                  <time dateTime={h.data}>{formatarDataHora(h.data)}</time>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </section>
  )
}
