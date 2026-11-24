import { useCallback, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarPlus, ChevronsRight } from 'lucide-react'
import { useConfig } from '../../contexto'
import {
  avancarStatusGrupo,
  ocupacao,
  proximoStatusGrupo,
  registrarAssembleia,
  ROTULO_STATUS_GRUPO,
} from '../../data/grupos'
import { ErroOperacao } from '../../data/operacoes'
import type { Repositorios } from '../../data/repositorios'
import { formatarMoeda, formatarPct } from '../../domain/dinheiro'
import { Aviso, CabecalhoPagina, CampoNumero, CampoTexto, type Mensagem } from '../../ui/campos'
import { formatarData, useCarregar } from '../../ui/dados'
import { Carregando } from '../../ui/etiquetas'
import './grupos.css'

interface FormAssembleia {
  data: string
  contempladosSorteio: number
  contempladosLance: number
  maiorLancePct: number
  menorLancePct: number
}

const hoje = () => new Date().toISOString().slice(0, 10)

export function GrupoPagina() {
  const { id = '' } = useParams()
  const carregar = useCallback(
    async (r: Repositorios) => {
      const [grupo, propostas, clientes] = await Promise.all([
        r.grupos.obter(id),
        r.propostas.listar(),
        r.clientes.listar(),
      ])
      return { grupo, propostas, clientes }
    },
    [id],
  )
  const { dados, recarregar, repositorios } = useCarregar(carregar)
  const { config } = useConfig()
  const [form, setForm] = useState<FormAssembleia>({
    data: hoje(),
    contempladosSorteio: 1,
    contempladosLance: 2,
    maiorLancePct: Number.NaN,
    menorLancePct: Number.NaN,
  })
  const [mensagem, setMensagem] = useState<Mensagem>(null)

  if (!dados || !config) return <Carregando />
  const { grupo, propostas, clientes } = dados
  if (!grupo) {
    return (
      <section className="card estado-vazio">
        <p>Grupo não encontrado.</p>
        <Link to="/grupos" className="btn">
          Voltar para grupos
        </Link>
      </section>
    )
  }
  const o = ocupacao(grupo, propostas)
  const vendidas = propostas.filter((p) => p.grupoId === grupo.id && p.status === 'aceita')
  const proximo = proximoStatusGrupo(grupo.status)
  const categoria = config.categorias.find((c) => c.id === grupo.categoriaId)?.nome ?? ''
  const alterar = (p: Partial<FormAssembleia>) => setForm((f) => ({ ...f, ...p }))

  async function executar(acao: () => Promise<unknown>, sucesso: string) {
    try {
      await acao()
      setMensagem({ tipo: 'sucesso', texto: sucesso })
      recarregar()
    } catch (erro) {
      setMensagem({
        tipo: 'erro',
        texto: erro instanceof ErroOperacao ? erro.message : 'Não foi possível salvar.',
      })
    }
  }

  async function salvarAssembleia(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!grupo) return
    const inteiro = (v: number) => Number.isInteger(v) && v >= 0 && v <= 1000
    const pct = (v: number) => (Number.isFinite(v) ? v : null)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.data)) {
      setMensagem({ tipo: 'erro', texto: 'Informe a data da assembleia.' })
      return
    }
    if (!inteiro(form.contempladosSorteio) || !inteiro(form.contempladosLance)) {
      setMensagem({ tipo: 'erro', texto: 'Informe o número de contemplados.' })
      return
    }
    const maior = pct(form.maiorLancePct)
    const menor = pct(form.menorLancePct)
    if ([maior, menor].some((v) => v !== null && (v < 0 || v > 100))) {
      setMensagem({ tipo: 'erro', texto: 'Percentuais de lance entre 0% e 100%.' })
      return
    }
    await executar(
      () =>
        registrarAssembleia(repositorios, grupo, {
          data: new Date(`${form.data}T12:00:00`).toISOString(),
          contempladosSorteio: form.contempladosSorteio,
          contempladosLance: form.contempladosLance,
          maiorLancePct: maior,
          menorLancePct: menor,
        }),
      'Assembleia registrada.',
    )
  }

  return (
    <section>
      <Link to="/grupos" className="link-voltar">
        <ArrowLeft size={16} aria-hidden="true" />
        Grupos
      </Link>
      <CabecalhoPagina
        titulo={`Grupo ${grupo.codigo}`}
        subtitulo={`${categoria} · ${grupo.prazoMeses} meses · ${ROTULO_STATUS_GRUPO[grupo.status]}`}
        acoes={
          proximo && (
            <button
              type="button"
              className="btn"
              onClick={() =>
                window.confirm(`Mudar o grupo para "${ROTULO_STATUS_GRUPO[proximo]}"?`) &&
                executar(
                  () => avancarStatusGrupo(repositorios, grupo),
                  `Grupo agora está ${ROTULO_STATUS_GRUPO[proximo].toLowerCase()}.`,
                )
              }
            >
              <ChevronsRight size={18} aria-hidden="true" />
              {grupo.status === 'formacao' ? 'Iniciar grupo' : 'Encerrar grupo'}
            </button>
          )
        }
      />
      {mensagem && <Aviso mensagem={mensagem} />}

      <div className="pilha">
        <div className="indicadores">
          <div className="indicador">
            <span className="indicador-rotulo">Participantes</span>
            <span className="indicador-valor">{grupo.participantes}</span>
          </div>
          <div className="indicador">
            <span className="indicador-rotulo">Cotas ocupadas</span>
            <span className="indicador-valor">{o.ocupadas}</span>
            <span className="indicador-nota">{formatarPct(o.pct, 1)} do grupo</span>
          </div>
          <div className="indicador">
            <span className="indicador-rotulo">Cotas disponíveis</span>
            <span className="indicador-valor" data-testid="grupo-disponiveis">
              {o.disponiveis}
            </span>
          </div>
          <div className="indicador">
            <span className="indicador-rotulo">Lance fixo</span>
            <span className="indicador-valor">{formatarPct(grupo.lanceFixoPct, 0)}</span>
            <span className="indicador-nota">início em {formatarData(grupo.inicio)}</span>
          </div>
        </div>

        <section className="card pilha-sm">
          <h2>Assembleias</h2>
          {grupo.assembleias.length === 0 ? (
            <p className="texto-secundario">Nenhuma assembleia realizada.</p>
          ) : (
            <div className="tabela-rolagem">
              <table className="tabela" aria-label="Assembleias">
                <thead>
                  <tr>
                    <th scope="col" className="num">
                      Nº
                    </th>
                    <th scope="col">Data</th>
                    <th scope="col" className="num">
                      Sorteio
                    </th>
                    <th scope="col" className="num">
                      Lance
                    </th>
                    <th scope="col" className="num">
                      Maior lance
                    </th>
                    <th scope="col" className="num">
                      Menor lance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...grupo.assembleias].reverse().map((a) => (
                    <tr key={a.id}>
                      <td className="num">{a.numero}</td>
                      <td>{formatarData(a.data)}</td>
                      <td className="num">{a.contempladosSorteio}</td>
                      <td className="num">{a.contempladosLance}</td>
                      <td className="num">
                        {a.maiorLancePct === null ? '—' : formatarPct(a.maiorLancePct, 1)}
                      </td>
                      <td className="num">
                        {a.menorLancePct === null ? '—' : formatarPct(a.menorLancePct, 1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {grupo.status === 'andamento' && (
            <form className="pilha-sm" onSubmit={salvarAssembleia} noValidate>
              <h3 className="subtitulo-form">Registrar assembleia (simulação)</h3>
              <div className="grade-campos">
                <CampoTexto
                  rotulo="Data"
                  tipo="date"
                  valor={form.data}
                  aoMudar={(data) => alterar({ data })}
                />
                <CampoNumero
                  rotulo="Contemplados por sorteio"
                  valor={form.contempladosSorteio}
                  aoMudar={(contempladosSorteio) => alterar({ contempladosSorteio })}
                />
                <CampoNumero
                  rotulo="Contemplados por lance"
                  valor={form.contempladosLance}
                  aoMudar={(contempladosLance) => alterar({ contempladosLance })}
                />
                <CampoNumero
                  rotulo="Maior lance"
                  sufixo="%"
                  decimais
                  valor={form.maiorLancePct}
                  aoMudar={(maiorLancePct) => alterar({ maiorLancePct })}
                />
                <CampoNumero
                  rotulo="Menor lance"
                  sufixo="%"
                  decimais
                  valor={form.menorLancePct}
                  aoMudar={(menorLancePct) => alterar({ menorLancePct })}
                />
              </div>
              <div>
                <button type="submit" className="btn">
                  <CalendarPlus size={18} aria-hidden="true" />
                  Registrar assembleia
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="card pilha-sm">
          <h2>Cotas vendidas pelo sistema</h2>
          {vendidas.length === 0 ? (
            <p className="texto-secundario">Nenhuma venda vinculada a este grupo.</p>
          ) : (
            <div className="tabela-rolagem">
              <table className="tabela" aria-label="Cotas vendidas">
                <thead>
                  <tr>
                    <th scope="col">Proposta</th>
                    <th scope="col">Cliente</th>
                    <th scope="col" className="num">
                      Carta
                    </th>
                    <th scope="col">Venda</th>
                  </tr>
                </thead>
                <tbody>
                  {vendidas.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link to={`/propostas/${p.id}`}>{p.numero}</Link>
                      </td>
                      <td>{clientes.find((c) => c.id === p.clienteId)?.nome ?? '—'}</td>
                      <td className="num">{formatarMoeda(p.parametros.carta)}</td>
                      <td>{p.fechadaEm ? formatarData(p.fechadaEm) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </section>
  )
}
