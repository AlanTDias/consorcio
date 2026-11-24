import { useState, type FormEvent } from 'react'
import { Save } from 'lucide-react'
import { useConfig, useServicos } from '../../contexto'
import type { Config } from '../../data/esquemas'
import { Aviso, CampoMoeda, type Mensagem } from '../../ui/campos'
import { useUsuarios } from '../../ui/dados'

export function MetasForm({ config }: { config: Config }) {
  const { repositorios } = useServicos()
  const { recarregar } = useConfig()
  const vendedores = useUsuarios().filter((u) => u.perfil === 'Vendedor')
  const [metas, setMetas] = useState<Record<string, number>>(() =>
    Object.fromEntries(config.metas.map((m) => [m.vendedorId, m.mensal])),
  )
  const [mensagem, setMensagem] = useState<Mensagem>(null)

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const lista = vendedores.map((v) => ({ vendedorId: v.id, mensal: metas[v.id] ?? 0 }))
    if (lista.some((m) => !Number.isInteger(m.mensal) || m.mensal < 0)) {
      setMensagem({ tipo: 'erro', texto: 'Informe metas válidas.' })
      return
    }
    await repositorios.config.salvar({ ...config, metas: lista })
    await recarregar()
    setMensagem({ tipo: 'sucesso', texto: 'Metas salvas.' })
  }

  return (
    <form className="card bloco-config" onSubmit={salvar} noValidate>
      <h2>Metas mensais (volume em cartas)</h2>
      {mensagem && <Aviso mensagem={mensagem} />}
      <div className="grade-campos">
        {vendedores.map((v) => (
          <CampoMoeda
            key={v.id}
            rotulo={v.nome}
            valor={metas[v.id] ?? 0}
            aoMudar={(valor) => setMetas((m) => ({ ...m, [v.id]: valor }))}
          />
        ))}
      </div>
      <div>
        <button type="submit" className="btn btn-primario">
          <Save size={18} aria-hidden="true" />
          Salvar metas
        </button>
      </div>
    </form>
  )
}
