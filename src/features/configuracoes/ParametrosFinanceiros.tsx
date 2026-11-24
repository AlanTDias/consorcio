import { useState, type FormEvent } from 'react'
import { Save } from 'lucide-react'
import { useConfig, useServicos } from '../../contexto'
import {
  configSchema,
  type Categoria,
  type Config,
  type Indice,
  type Taxas,
} from '../../data/esquemas'
import { Aviso, CampoMoeda, CampoNumero, CampoSelecao, type Mensagem } from '../../ui/campos'

const CAMPOS_TAXAS: { campo: keyof Taxas; rotulo: string; sufixo: string }[] = [
  { campo: 'admAnualPct', rotulo: 'Taxa de administração', sufixo: '% a.a.' },
  { campo: 'fundoReservaPct', rotulo: 'Fundo de reserva', sufixo: '%' },
  { campo: 'seguroMensalPct', rotulo: 'Seguro prestamista', sufixo: '% a.m.' },
  { campo: 'lanceEmbutidoMaxPct', rotulo: 'Lance embutido máximo', sufixo: '%' },
  { campo: 'parcelaReduzidaPct', rotulo: 'Parcela reduzida', sufixo: '%' },
]

export function ParametrosFinanceiros({ config }: { config: Config }) {
  const { repositorios } = useServicos()
  const { recarregar } = useConfig()
  const [taxas, setTaxas] = useState<Taxas>(config.taxas)
  const [indices, setIndices] = useState<Indice[]>(config.indices)
  const [categorias, setCategorias] = useState<Categoria[]>(config.categorias)
  const [mensagem, setMensagem] = useState<Mensagem>(null)
  const [erros, setErros] = useState<Record<string, string>>({})

  function alterarCategoria(indice: number, parcial: Partial<Categoria>) {
    setCategorias((atual) => atual.map((c, i) => (i === indice ? { ...c, ...parcial } : c)))
  }

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setMensagem(null)
    const novos: Record<string, string> = {}
    const resultado = configSchema.safeParse({ ...config, taxas, indices, categorias })
    if (!resultado.success) {
      for (const problema of resultado.error.issues) {
        novos[problema.path.join('.')] = 'Valor inválido'
      }
    }
    categorias.forEach((c, i) => {
      if (c.prazoMinMeses > c.prazoMaxMeses)
        novos[`categorias.${i}.prazoMaxMeses`] = 'Menor que o mínimo'
      if (c.cartaMin > c.cartaMax) novos[`categorias.${i}.cartaMax`] = 'Menor que o mínimo'
    })
    setErros(novos)
    if (!resultado.success || Object.keys(novos).length > 0) {
      setMensagem({ tipo: 'erro', texto: 'Revise os campos destacados.' })
      return
    }
    await repositorios.config.salvar(resultado.data)
    await recarregar()
    setMensagem({ tipo: 'sucesso', texto: 'Parâmetros salvos.' })
  }

  return (
    <form className="card bloco-config" onSubmit={salvar} noValidate>
      <h2>Taxas e índices</h2>
      {mensagem && <Aviso mensagem={mensagem} />}
      <div className="grade-campos">
        {CAMPOS_TAXAS.map(({ campo, rotulo, sufixo }) => (
          <CampoNumero
            key={campo}
            rotulo={rotulo}
            sufixo={sufixo}
            decimais
            valor={taxas[campo]}
            aoMudar={(v) => setTaxas((t) => ({ ...t, [campo]: v }))}
            erro={erros[`taxas.${campo}`]}
          />
        ))}
        {indices.map((indice, i) => (
          <CampoNumero
            key={indice.codigo}
            rotulo={`Projeção ${indice.codigo}`}
            sufixo="% a.a."
            decimais
            valor={indice.anualPct}
            aoMudar={(v) =>
              setIndices((atual) => atual.map((x, j) => (j === i ? { ...x, anualPct: v } : x)))
            }
            erro={erros[`indices.${i}.anualPct`]}
          />
        ))}
      </div>

      <h2>Categorias</h2>
      <div className="pilha-sm">
        {categorias.map((c, i) => (
          <fieldset key={c.id} className="categoria-config">
            <legend>{c.nome}</legend>
            <div className="grade-campos">
              <CampoSelecao
                rotulo="Índice de reajuste"
                valor={c.indice}
                opcoes={indices.map((x) => ({ valor: x.codigo, rotulo: x.codigo }))}
                aoMudar={(indice) => alterarCategoria(i, { indice })}
              />
              <CampoNumero
                rotulo="Prazo mínimo"
                sufixo="meses"
                valor={c.prazoMinMeses}
                aoMudar={(v) => alterarCategoria(i, { prazoMinMeses: v })}
                erro={erros[`categorias.${i}.prazoMinMeses`]}
              />
              <CampoNumero
                rotulo="Prazo máximo"
                sufixo="meses"
                valor={c.prazoMaxMeses}
                aoMudar={(v) => alterarCategoria(i, { prazoMaxMeses: v })}
                erro={erros[`categorias.${i}.prazoMaxMeses`]}
              />
              <CampoMoeda
                rotulo="Carta mínima"
                valor={c.cartaMin}
                aoMudar={(v) => alterarCategoria(i, { cartaMin: v })}
                erro={erros[`categorias.${i}.cartaMin`]}
              />
              <CampoMoeda
                rotulo="Carta máxima"
                valor={c.cartaMax}
                aoMudar={(v) => alterarCategoria(i, { cartaMax: v })}
                erro={erros[`categorias.${i}.cartaMax`]}
              />
              <CampoNumero
                rotulo="Lance fixo"
                sufixo="%"
                decimais
                valor={c.lanceFixoPct}
                aoMudar={(v) => alterarCategoria(i, { lanceFixoPct: v })}
                erro={erros[`categorias.${i}.lanceFixoPct`]}
              />
            </div>
          </fieldset>
        ))}
      </div>
      <div>
        <button type="submit" className="btn btn-primario">
          <Save size={18} aria-hidden="true" />
          Salvar taxas e categorias
        </button>
      </div>
    </form>
  )
}
