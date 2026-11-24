import { useMemo, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { useConfig } from '../../contexto'
import type { Config } from '../../data/esquemas'
import { simularConsorcio } from '../../domain/consorcio'
import { formatarPct } from '../../domain/dinheiro'
import { CabecalhoPagina, CampoMoeda, CampoNumero, Interruptor, Segmentado } from '../../ui/campos'
import {
  categoriaDe,
  formularioPadrao,
  formularioSimulacaoSchema,
  indiceDaCategoria,
  montarParametros,
  validarFormulario,
  valoresDaCategoria,
  type FormularioSimulacao,
} from './formulario'
import { ResultadoSimulacao, TabelaEvolucao } from './ResultadoSimulacao'
import './simulador.css'

const CHAVE_RASCUNHO = 'consorcio:v1:simulador'

function lerRascunho(config: Config): FormularioSimulacao {
  try {
    const bruto = sessionStorage.getItem(CHAVE_RASCUNHO)
    const lido = formularioSimulacaoSchema.safeParse(bruto ? JSON.parse(bruto) : undefined)
    if (lido.success && config.categorias.some((c) => c.id === lido.data.categoriaId)) {
      return lido.data
    }
  } catch {
    return formularioPadrao(config)
  }
  return formularioPadrao(config)
}

export function SimuladorPagina() {
  const { config } = useConfig()
  if (!config) return null
  return <Simulador config={config} />
}

function Simulador({ config }: { config: Config }) {
  const [form, setForm] = useState<FormularioSimulacao>(() => lerRascunho(config))
  const [verEvolucao, setVerEvolucao] = useState(false)

  function alterar(parcial: Partial<FormularioSimulacao>) {
    setForm((atual) => {
      const novo = { ...atual, ...parcial }
      try {
        sessionStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(novo))
      } catch {
        return novo
      }
      return novo
    })
  }

  const categoria = categoriaDe(config, form.categoriaId)
  const indice = indiceDaCategoria(config, categoria)
  const erros = validarFormulario(form, config)
  const valido = Object.keys(erros).length === 0

  const simulacao = useMemo(() => {
    if (!valido) return null
    const parametros = montarParametros(form, config)
    return { parametros, resultado: simularConsorcio(parametros) }
  }, [form, config, valido])

  const precisaMes = form.contemplacao !== 'nenhuma' || form.parcelaReduzida

  return (
    <section>
      <CabecalhoPagina
        titulo="Simulador de consórcio"
        subtitulo="Ajuste os valores e veja o resultado na hora. Consórcio não tem juros."
        acoes={
          <button
            type="button"
            className="btn"
            onClick={() => {
              sessionStorage.removeItem(CHAVE_RASCUNHO)
              setForm(formularioPadrao(config))
            }}
          >
            <RotateCcw size={18} aria-hidden="true" />
            Limpar
          </button>
        }
      />

      <div className="simulador">
        <form className="card pilha-sm" onSubmit={(e) => e.preventDefault()} noValidate>
          <Segmentado
            rotulo="Categoria"
            valor={form.categoriaId}
            opcoes={config.categorias.map((c) => ({ valor: c.id, rotulo: c.nome }))}
            aoMudar={(id) =>
              alterar({ categoriaId: id, ...valoresDaCategoria(categoriaDe(config, id)) })
            }
          />
          <CampoMoeda
            rotulo="Carta de crédito"
            valor={form.carta}
            aoMudar={(carta) => alterar({ carta })}
            erro={erros.carta}
            testId="campo-carta"
          />
          <CampoNumero
            rotulo="Prazo"
            sufixo="meses"
            valor={form.prazo}
            aoMudar={(prazo) => alterar({ prazo })}
            erro={erros.prazo}
            ajuda={`De ${categoria.prazoMinMeses} a ${categoria.prazoMaxMeses} meses`}
            testId="campo-prazo"
          />

          <div className="separador" />

          <Interruptor
            rotulo="Seguro prestamista"
            descricao={`${formatarPct(config.taxas.seguroMensalPct, 3)} ao mês sobre o saldo devedor`}
            ligado={form.seguro}
            aoMudar={(seguro) => alterar({ seguro })}
          />
          <Interruptor
            rotulo="Reajuste anual projetado"
            descricao={
              indice
                ? `${indice.codigo}: ${formatarPct(indice.anualPct)} ao ano (projeção editável em Configurações)`
                : 'Índice não configurado'
            }
            ligado={form.reajuste}
            aoMudar={(reajuste) => alterar({ reajuste })}
          />
          <Interruptor
            rotulo="Parcela reduzida até a contemplação"
            descricao={`${formatarPct(config.taxas.parcelaReduzidaPct, 0)} da parcela; a diferença é redistribuída depois`}
            ligado={form.parcelaReduzida}
            aoMudar={(parcelaReduzida) => alterar({ parcelaReduzida })}
          />

          <div className="separador" />

          <Segmentado
            rotulo="Contemplação (simulação)"
            valor={form.contemplacao}
            opcoes={[
              { valor: 'nenhuma', rotulo: 'Não simular' },
              { valor: 'sorteio', rotulo: 'Sorteio' },
              { valor: 'lance', rotulo: 'Lance' },
            ]}
            aoMudar={(contemplacao) => alterar({ contemplacao })}
          />
          {precisaMes && (
            <CampoNumero
              rotulo="Mês hipotético de contemplação"
              valor={form.mesContemplacao}
              aoMudar={(mesContemplacao) => alterar({ mesContemplacao })}
              erro={erros.mesContemplacao}
              testId="campo-mes"
            />
          )}
          {form.contemplacao === 'lance' && (
            <>
              <Segmentado
                rotulo="Tipo de lance"
                valor={form.tipoLance}
                opcoes={[
                  { valor: 'livre', rotulo: 'Livre' },
                  { valor: 'embutido', rotulo: 'Embutido' },
                  { valor: 'fixo', rotulo: 'Fixo' },
                ]}
                aoMudar={(tipoLance) => alterar({ tipoLance })}
              />
              <CampoNumero
                rotulo="Lance (% da carta)"
                sufixo="%"
                decimais
                valor={form.tipoLance === 'fixo' ? categoria.lanceFixoPct : form.pctLance}
                aoMudar={(pctLance) => alterar({ pctLance })}
                desabilitado={form.tipoLance === 'fixo'}
                erro={erros.pctLance}
                ajuda={
                  form.tipoLance === 'embutido'
                    ? `Até ${formatarPct(config.taxas.lanceEmbutidoMaxPct, 0)}; sai da própria carta`
                    : form.tipoLance === 'fixo'
                      ? 'Percentual fixo da categoria'
                      : 'Pago com recursos próprios'
                }
                testId="campo-lance"
              />
              <Segmentado
                rotulo="Usar o lance para reduzir"
                valor={form.efeitoLance}
                opcoes={[
                  { valor: 'parcela', rotulo: 'Parcela' },
                  { valor: 'prazo', rotulo: 'Prazo' },
                ]}
                aoMudar={(efeitoLance) => alterar({ efeitoLance })}
              />
            </>
          )}
        </form>

        <div className="card pilha-sm resultado" aria-live="polite">
          <h2>Resultado</h2>
          {simulacao ? (
            <>
              <ResultadoSimulacao {...simulacao} />
            </>
          ) : (
            <p className="texto-secundario">Corrija os campos destacados para ver a simulação.</p>
          )}
        </div>
      </div>

      {simulacao && (
        <section className="card pilha-sm evolucao">
          <div className="evolucao-topo">
            <h2>Evolução mês a mês</h2>
            <button
              type="button"
              className="btn btn-pequeno"
              aria-expanded={verEvolucao}
              onClick={() => setVerEvolucao((v) => !v)}
            >
              {verEvolucao ? 'Ocultar tabela' : `Ver ${simulacao.resultado.prazoEfetivo} meses`}
            </button>
          </div>
          {verEvolucao && <TabelaEvolucao resultado={simulacao.resultado} />}
        </section>
      )}
    </section>
  )
}
