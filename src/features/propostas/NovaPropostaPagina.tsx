import { useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { z } from 'zod'
import { useAuth, useConfig, useServicos } from '../../contexto'
import { formularioSimulacaoSchema, TELEFONE_REGEX, type Config } from '../../data/esquemas'
import { criarCliente, criarProposta, visiveis } from '../../data/operacoes'
import type { Repositorios } from '../../data/repositorios'
import { simularConsorcio } from '../../domain/consorcio'
import { CabecalhoPagina, CampoSelecao, CampoTexto, Segmentado } from '../../ui/campos'
import { useCarregar } from '../../ui/dados'
import { Carregando } from '../../ui/etiquetas'
import { mascararTelefone } from '../../ui/mascaras'
import { montarParametros, validarFormulario } from '../simulador/formulario'
import { ResultadoSimulacao } from '../simulador/ResultadoSimulacao'

const estadoSchema = z.object({
  formulario: formularioSimulacaoSchema,
  clienteId: z.string().max(60).optional(),
})

const listarClientes = (r: Repositorios) => r.clientes.listar()

export function NovaPropostaPagina() {
  const { config } = useConfig()
  const local = useLocation()
  const estado = estadoSchema.safeParse(local.state)
  if (!config) return null
  if (!estado.success || Object.keys(validarFormulario(estado.data.formulario, config)).length) {
    return (
      <section className="card estado-vazio">
        <p>Faça uma simulação antes de gerar a proposta.</p>
        <Link to="/simulador" className="btn btn-primario">
          Ir para o simulador
        </Link>
      </section>
    )
  }
  return (
    <Formulario
      config={config}
      formulario={estado.data.formulario}
      clienteInicial={estado.data.clienteId ?? ''}
    />
  )
}

function Formulario({
  config,
  formulario,
  clienteInicial,
}: {
  config: Config
  formulario: z.infer<typeof formularioSimulacaoSchema>
  clienteInicial: string
}) {
  const { sessao } = useAuth()
  const { repositorios } = useServicos()
  const navegar = useNavigate()
  const { dados: todos } = useCarregar(listarClientes)
  const [modo, setModo] = useState<'existente' | 'novo'>('existente')
  const [clienteId, setClienteId] = useState(clienteInicial)
  const [novoNome, setNovoNome] = useState('')
  const [novoTelefone, setNovoTelefone] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [erros, setErros] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState(false)

  const simulacao = useMemo(() => {
    const parametros = montarParametros(formulario, config)
    return { parametros, resultado: simularConsorcio(parametros) }
  }, [formulario, config])

  if (!sessao) return null
  if (!todos) return <Carregando />
  const clientes = visiveis(sessao, todos).sort((a, b) => a.nome.localeCompare(b.nome))
  const selecionado = clientes.find((c) => c.id === clienteId)

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!sessao) return
    const novos: Record<string, string> = {}
    if (modo === 'existente' && !selecionado) novos.cliente = 'Escolha um cliente.'
    if (modo === 'novo') {
      if (!novoNome.trim()) novos.nome = 'Informe o nome.'
      if (novoTelefone && !TELEFONE_REGEX.test(novoTelefone)) novos.telefone = 'Use (11) 90000-0000'
    }
    setErros(novos)
    if (Object.keys(novos).length) return
    setSalvando(true)
    const cliente =
      modo === 'novo'
        ? await criarCliente(repositorios, {
            nome: novoNome.trim(),
            telefone: novoTelefone,
            email: '',
            cpf: '',
            categoriaInteresse: formulario.categoriaId,
            vendedorId: sessao.usuarioId,
          })
        : selecionado
    if (!cliente) return
    const proposta = await criarProposta(repositorios, {
      cliente,
      vendedorId: cliente.vendedorId,
      formulario,
      parametros: simulacao.parametros,
      observacoes,
    })
    navegar(`/propostas/${proposta.id}`, { replace: true })
  }

  return (
    <section>
      <Link to="/simulador" className="link-voltar">
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar ao simulador
      </Link>
      <CabecalhoPagina
        titulo="Nova proposta"
        subtitulo="Confira a simulação e escolha o cliente."
      />
      <div className="ficha">
        <section className="card pilha-sm">
          <h2>Simulação</h2>
          <ResultadoSimulacao {...simulacao} />
        </section>
        <form className="card pilha-sm" onSubmit={salvar} noValidate>
          <h2>Cliente</h2>
          <Segmentado
            rotulo="Cliente da proposta"
            valor={modo}
            opcoes={[
              { valor: 'existente', rotulo: 'Já cadastrado' },
              { valor: 'novo', rotulo: 'Novo cliente' },
            ]}
            aoMudar={setModo}
          />
          {modo === 'existente' ? (
            <CampoSelecao
              rotulo="Cliente"
              valor={clienteId}
              opcoes={[
                { valor: '', rotulo: 'Selecione…' },
                ...clientes.map((c) => ({ valor: c.id, rotulo: c.nome })),
              ]}
              aoMudar={setClienteId}
              erro={erros.cliente}
            />
          ) : (
            <>
              <CampoTexto
                rotulo="Nome *"
                valor={novoNome}
                aoMudar={setNovoNome}
                erro={erros.nome}
                maximo={80}
              />
              <CampoTexto
                rotulo="Telefone"
                tipo="tel"
                valor={novoTelefone}
                aoMudar={(v) => setNovoTelefone(mascararTelefone(v))}
                erro={erros.telefone}
                maximo={15}
              />
            </>
          )}
          <CampoTexto
            rotulo="Observações"
            multilinha
            maximo={1000}
            valor={observacoes}
            aoMudar={setObservacoes}
          />
          <div>
            <button type="submit" className="btn btn-primario" disabled={salvando}>
              <Save size={18} aria-hidden="true" />
              Salvar proposta
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
