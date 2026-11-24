import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { useConfig, useServicos } from '../../contexto'
import { criarGrupo } from '../../data/grupos'
import { ErroOperacao } from '../../data/operacoes'
import {
  Aviso,
  CabecalhoPagina,
  CampoNumero,
  CampoSelecao,
  CampoTexto,
  type Mensagem,
} from '../../ui/campos'

interface Form {
  codigo: string
  categoriaId: string
  prazoMeses: number
  participantes: number
  cotasOcupadasIniciais: number
  lanceFixoPct: number
  inicio: string
}

type Erros = Partial<Record<keyof Form, string>>

function hojeMaisUmMes(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 1, 10)
  return d.toISOString().slice(0, 10)
}

export function GrupoFormPagina() {
  const { config } = useConfig()
  const { repositorios } = useServicos()
  const navegar = useNavigate()
  const primeira = config?.categorias[0]
  const [form, setForm] = useState<Form>({
    codigo: '',
    categoriaId: primeira?.id ?? 'imovel',
    prazoMeses: primeira?.prazoMaxMeses ?? 120,
    participantes: 200,
    cotasOcupadasIniciais: 0,
    lanceFixoPct: primeira?.lanceFixoPct ?? 30,
    inicio: hojeMaisUmMes(),
  })
  const [erros, setErros] = useState<Erros>({})
  const [mensagem, setMensagem] = useState<Mensagem>(null)

  if (!config) return null
  const categoria = config.categorias.find((c) => c.id === form.categoriaId)
  const alterar = (p: Partial<Form>) => setForm((f) => ({ ...f, ...p }))

  function validar(): Erros {
    const e: Erros = {}
    if (!/^[A-Z]{2}-\d{3}$/.test(form.codigo.trim().toUpperCase()))
      e.codigo = 'Use o formato IM-301'
    if (
      categoria &&
      (!Number.isInteger(form.prazoMeses) ||
        form.prazoMeses < categoria.prazoMinMeses ||
        form.prazoMeses > categoria.prazoMaxMeses)
    ) {
      e.prazoMeses = `Entre ${categoria.prazoMinMeses} e ${categoria.prazoMaxMeses} meses.`
    }
    if (
      !Number.isInteger(form.participantes) ||
      form.participantes < 2 ||
      form.participantes > 5000
    ) {
      e.participantes = 'Entre 2 e 5.000.'
    }
    if (
      !Number.isInteger(form.cotasOcupadasIniciais) ||
      form.cotasOcupadasIniciais < 0 ||
      form.cotasOcupadasIniciais > form.participantes
    ) {
      e.cotasOcupadasIniciais = 'Entre 0 e o número de participantes.'
    }
    if (!(form.lanceFixoPct > 0 && form.lanceFixoPct <= 100)) e.lanceFixoPct = 'Entre 1% e 100%.'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.inicio)) e.inicio = 'Informe a data.'
    return e
  }

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setMensagem(null)
    const e = validar()
    setErros(e)
    if (Object.keys(e).length) return
    try {
      const grupo = await criarGrupo(repositorios, {
        ...form,
        inicio: new Date(`${form.inicio}T12:00:00`).toISOString(),
      })
      navegar(`/grupos/${grupo.id}`)
    } catch (erro) {
      setMensagem({
        tipo: 'erro',
        texto: erro instanceof ErroOperacao ? erro.message : 'Não foi possível salvar.',
      })
    }
  }

  return (
    <section>
      <Link to="/grupos" className="link-voltar">
        <ArrowLeft size={16} aria-hidden="true" />
        Grupos
      </Link>
      <CabecalhoPagina titulo="Novo grupo" subtitulo="O grupo começa em formação." />
      <form className="card pilha-sm" onSubmit={salvar} noValidate>
        {mensagem && <Aviso mensagem={mensagem} />}
        <div className="grade-campos">
          <CampoTexto
            rotulo="Código"
            valor={form.codigo}
            aoMudar={(codigo) => alterar({ codigo: codigo.toUpperCase() })}
            erro={erros.codigo}
            maximo={6}
            ajuda="Duas letras e três números, ex.: IM-310"
          />
          <CampoSelecao
            rotulo="Categoria"
            valor={form.categoriaId}
            opcoes={config.categorias.map((c) => ({ valor: c.id, rotulo: c.nome }))}
            aoMudar={(categoriaId) => {
              const c = config.categorias.find((x) => x.id === categoriaId)
              alterar({
                categoriaId,
                prazoMeses: c?.prazoMaxMeses ?? form.prazoMeses,
                lanceFixoPct: c?.lanceFixoPct ?? form.lanceFixoPct,
              })
            }}
          />
          <CampoNumero
            rotulo="Prazo"
            sufixo="meses"
            valor={form.prazoMeses}
            aoMudar={(prazoMeses) => alterar({ prazoMeses })}
            erro={erros.prazoMeses}
          />
          <CampoNumero
            rotulo="Participantes"
            valor={form.participantes}
            aoMudar={(participantes) => alterar({ participantes })}
            erro={erros.participantes}
          />
          <CampoNumero
            rotulo="Cotas já ocupadas"
            valor={form.cotasOcupadasIniciais}
            aoMudar={(cotasOcupadasIniciais) => alterar({ cotasOcupadasIniciais })}
            erro={erros.cotasOcupadasIniciais}
          />
          <CampoNumero
            rotulo="Lance fixo"
            sufixo="%"
            decimais
            valor={form.lanceFixoPct}
            aoMudar={(lanceFixoPct) => alterar({ lanceFixoPct })}
            erro={erros.lanceFixoPct}
          />
          <CampoTexto
            rotulo="Início previsto"
            tipo="date"
            valor={form.inicio}
            aoMudar={(inicio) => alterar({ inicio })}
            erro={erros.inicio}
          />
        </div>
        <div>
          <button type="submit" className="btn btn-primario">
            <Save size={18} aria-hidden="true" />
            Criar grupo
          </button>
        </div>
      </form>
    </section>
  )
}
