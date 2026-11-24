import { useCallback, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { useAuth, useConfig, useServicos } from '../../contexto'
import { clienteSchema, type Cliente } from '../../data/esquemas'
import { atualizarCliente, criarCliente, podeVer, type DadosCliente } from '../../data/operacoes'
import type { Repositorios } from '../../data/repositorios'
import { AcessoNegado } from '../acesso/AcessoNegado'
import { CabecalhoPagina, CampoSelecao, CampoTexto } from '../../ui/campos'
import { useCarregar, useUsuarios } from '../../ui/dados'
import { Carregando } from '../../ui/etiquetas'
import { mascararCpf, mascararTelefone } from '../../ui/mascaras'

export function ClienteFormPagina() {
  const { id } = useParams()
  const carregar = useCallback(
    (r: Repositorios) => (id ? r.clientes.obter(id) : Promise.resolve(null)),
    [id],
  )
  const { dados } = useCarregar(carregar)
  if (dados === undefined) return <Carregando />
  if (id && !dados) return <NaoEncontrado />
  return <Formulario cliente={dados ?? null} />
}

export function NaoEncontrado() {
  return (
    <section className="card estado-vazio">
      <p>Registro não encontrado.</p>
      <Link to="/clientes" className="btn">
        Voltar para clientes
      </Link>
    </section>
  )
}

type Erros = Partial<Record<keyof DadosCliente, string>>

function Formulario({ cliente }: { cliente: Cliente | null }) {
  const { sessao } = useAuth()
  const { config } = useConfig()
  const usuarios = useUsuarios()
  const navegar = useNavigate()
  const { repositorios } = useServicos()
  const [dados, setDados] = useState<DadosCliente>(() => ({
    nome: cliente?.nome ?? '',
    email: cliente?.email ?? '',
    telefone: cliente?.telefone ?? '',
    cpf: cliente?.cpf ?? '',
    categoriaInteresse: cliente?.categoriaInteresse ?? config?.categorias[0]?.id ?? 'imovel',
    vendedorId: cliente?.vendedorId ?? sessao?.usuarioId ?? '',
  }))
  const [erros, setErros] = useState<Erros>({})
  const [salvando, setSalvando] = useState(false)

  if (!sessao || !config) return null
  if (cliente && !podeVer(sessao, cliente)) return <AcessoNegado />
  const escolheVendedor = sessao.perfil !== 'Vendedor'
  const vendedores = usuarios.filter((u) => u.perfil === 'Vendedor' || u.id === dados.vendedorId)

  const alterar = (parcial: Partial<DadosCliente>) => setDados((d) => ({ ...d, ...parcial }))

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const validacao = clienteSchema
      .pick({ nome: true, email: true, telefone: true, cpf: true })
      .safeParse({ ...dados, email: dados.email.trim() })
    if (!validacao.success) {
      const novos: Erros = {}
      for (const p of validacao.error.issues) {
        const campo = p.path[0] as keyof DadosCliente
        if (!novos[campo]) novos[campo] = p.message
      }
      setErros(novos)
      return
    }
    setErros({})
    setSalvando(true)
    const limpos = { ...dados, ...validacao.data }
    const salvo = cliente
      ? await atualizarCliente(repositorios, cliente, limpos)
      : await criarCliente(repositorios, limpos)
    navegar(`/clientes/${salvo.id}`)
  }

  return (
    <section>
      <Link to={cliente ? `/clientes/${cliente.id}` : '/clientes'} className="link-voltar">
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar
      </Link>
      <CabecalhoPagina titulo={cliente ? 'Editar cliente' : 'Novo cliente'} />
      <form className="card pilha-sm" onSubmit={salvar} noValidate>
        <p className="texto-secundario">
          Use apenas dados fictícios: este é um ambiente de demonstração.
        </p>
        <div className="grade-campos">
          <CampoTexto
            rotulo="Nome *"
            valor={dados.nome}
            aoMudar={(nome) => alterar({ nome })}
            erro={erros.nome}
            maximo={80}
          />
          <CampoTexto
            rotulo="Telefone"
            tipo="tel"
            valor={dados.telefone}
            aoMudar={(v) => alterar({ telefone: mascararTelefone(v) })}
            erro={erros.telefone}
            maximo={15}
          />
          <CampoTexto
            rotulo="E-mail"
            tipo="email"
            valor={dados.email}
            aoMudar={(email) => alterar({ email })}
            erro={erros.email}
          />
          <CampoTexto
            rotulo="CPF"
            valor={dados.cpf}
            aoMudar={(v) => alterar({ cpf: mascararCpf(v) })}
            erro={erros.cpf}
            maximo={14}
          />
          <CampoSelecao
            rotulo="Interesse"
            valor={dados.categoriaInteresse}
            opcoes={config.categorias.map((c) => ({ valor: c.id, rotulo: c.nome }))}
            aoMudar={(categoriaInteresse) => alterar({ categoriaInteresse })}
          />
          {escolheVendedor && vendedores.length > 0 && (
            <CampoSelecao
              rotulo="Vendedor responsável"
              valor={dados.vendedorId}
              opcoes={vendedores.map((u) => ({ valor: u.id, rotulo: u.nome }))}
              aoMudar={(vendedorId) => alterar({ vendedorId })}
            />
          )}
        </div>
        <div>
          <button type="submit" className="btn btn-primario" disabled={salvando}>
            <Save size={18} aria-hidden="true" />
            Salvar cliente
          </button>
        </div>
      </form>
    </section>
  )
}
