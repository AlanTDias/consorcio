import { useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Download, RotateCcw, Save, Upload } from 'lucide-react'
import { useConfig, useServicos } from '../../contexto'
import { empresaSchema, type Config, type Empresa } from '../../data/esquemas'
import { ErroBackup, TAMANHO_MAXIMO_BACKUP } from '../../data/local/repositoriosLocais'
import { Aviso, type Mensagem } from '../../ui/campos'
import { mascararCnpj } from '../../ui/mascaras'
import { ParametrosFinanceiros } from './ParametrosFinanceiros'
import './configuracoes.css'

const CAMPOS_EMPRESA: { campo: keyof Empresa; rotulo: string; placeholder: string }[] = [
  { campo: 'nomeSistema', rotulo: 'Nome do sistema', placeholder: 'Consórcio' },
  { campo: 'razaoSocial', rotulo: 'Razão social', placeholder: 'Empresa Exemplo Ltda.' },
  { campo: 'cnpj', rotulo: 'CNPJ', placeholder: '00.000.000/0000-00' },
  {
    campo: 'administradoraParceira',
    rotulo: 'Administradora parceira',
    placeholder: 'Nome da administradora',
  },
]

export function ConfiguracoesPagina() {
  const { config } = useConfig()
  const [mensagemEmpresa, setMensagemEmpresa] = useState<Mensagem>(null)
  const [versao, setVersao] = useState(0)
  if (!config) return null
  return (
    <section className="configuracoes">
      <header className="cabecalho-pagina">
        <h1>Configurações</h1>
        <p className="texto-secundario">
          Dados da empresa, taxas, categorias e cópia de segurança.
        </p>
      </header>
      <FormularioEmpresa
        key={JSON.stringify(config.empresa)}
        config={config}
        mensagem={mensagemEmpresa}
        aoMudarMensagem={setMensagemEmpresa}
      />
      <ParametrosFinanceiros key={versao} config={config} />
      <SecaoBackup
        aoRestaurar={() => {
          setMensagemEmpresa(null)
          setVersao((v) => v + 1)
        }}
      />
    </section>
  )
}

interface PropsFormulario {
  config: Config
  mensagem: Mensagem
  aoMudarMensagem(mensagem: Mensagem): void
}

function FormularioEmpresa({ config, mensagem, aoMudarMensagem }: PropsFormulario) {
  const { repositorios } = useServicos()
  const { recarregar } = useConfig()
  const id = useId()
  const [empresa, setEmpresa] = useState<Empresa>(config.empresa)
  const [erros, setErros] = useState<Partial<Record<keyof Empresa, string>>>({})

  function alterar(campo: keyof Empresa, valor: string) {
    setEmpresa((atual) => ({ ...atual, [campo]: campo === 'cnpj' ? mascararCnpj(valor) : valor }))
  }

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    aoMudarMensagem(null)
    const resultado = empresaSchema.safeParse(empresa)
    if (!resultado.success) {
      const novos: Partial<Record<keyof Empresa, string>> = {}
      for (const problema of resultado.error.issues) {
        const campo = problema.path[0] as keyof Empresa
        if (!novos[campo]) novos[campo] = problema.message
      }
      setErros(novos)
      return
    }
    setErros({})
    await repositorios.config.salvar({ ...config, empresa: resultado.data })
    aoMudarMensagem({ tipo: 'sucesso', texto: 'Dados da empresa salvos.' })
    await recarregar()
  }

  return (
    <form className="card bloco-config" onSubmit={salvar} noValidate>
      <h2>Dados da empresa</h2>
      {mensagem && <Aviso mensagem={mensagem} />}
      <div className="grade-campos">
        {CAMPOS_EMPRESA.map(({ campo, rotulo, placeholder }) => (
          <div className="campo" key={campo}>
            <label htmlFor={`${id}-${campo}`}>{rotulo}</label>
            <input
              id={`${id}-${campo}`}
              className="entrada"
              value={empresa[campo]}
              placeholder={placeholder}
              maxLength={campo === 'cnpj' ? 18 : 120}
              inputMode={campo === 'cnpj' ? 'numeric' : undefined}
              onChange={(e) => alterar(campo, e.target.value)}
              aria-invalid={!!erros[campo]}
            />
            {erros[campo] && <span className="erro-campo">{erros[campo]}</span>}
          </div>
        ))}
      </div>
      <div>
        <button type="submit" className="btn btn-primario">
          <Save size={18} aria-hidden="true" />
          Salvar dados da empresa
        </button>
      </div>
    </form>
  )
}

function SecaoBackup({ aoRestaurar }: { aoRestaurar(): void }) {
  const { repositorios } = useServicos()
  const { recarregar } = useConfig()
  const id = useId()
  const arquivoRef = useRef<HTMLInputElement>(null)
  const [mensagem, setMensagem] = useState<Mensagem>(null)

  async function exportar() {
    const conteudo = await repositorios.backup.exportar()
    const url = URL.createObjectURL(new Blob([conteudo], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `consorcio-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setMensagem({ tipo: 'sucesso', texto: 'Backup exportado.' })
  }

  async function importar(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!arquivo) return
    if (arquivo.size > TAMANHO_MAXIMO_BACKUP) {
      setMensagem({ tipo: 'erro', texto: 'Arquivo muito grande para um backup deste sistema.' })
      return
    }
    if (!window.confirm('Importar este backup substitui os dados atuais. Continuar?')) return
    try {
      await repositorios.backup.importar(await arquivo.text())
      await recarregar()
      aoRestaurar()
      setMensagem({ tipo: 'sucesso', texto: 'Backup importado com sucesso.' })
    } catch (erro) {
      setMensagem({
        tipo: 'erro',
        texto: erro instanceof ErroBackup ? erro.message : 'Não foi possível importar o arquivo.',
      })
    }
  }

  async function restaurar() {
    if (!window.confirm('Apagar os dados deste navegador e restaurar os dados de exemplo?')) return
    await repositorios.backup.restaurarExemplo()
    await recarregar()
    aoRestaurar()
    setMensagem({ tipo: 'sucesso', texto: 'Dados de exemplo restaurados.' })
  }

  return (
    <section className="card bloco-config" aria-labelledby={`${id}-backup`}>
      <h2 id={`${id}-backup`}>Backup dos dados</h2>
      <p className="texto-secundario">
        Os dados ficam só neste navegador. Exporte um arquivo JSON para guardar ou levar a outro
        computador.
      </p>
      {mensagem && <Aviso mensagem={mensagem} />}
      <div className="acoes">
        <button type="button" className="btn" onClick={exportar}>
          <Download size={18} aria-hidden="true" />
          Exportar JSON
        </button>
        <button type="button" className="btn" onClick={() => arquivoRef.current?.click()}>
          <Upload size={18} aria-hidden="true" />
          Importar JSON
        </button>
        <input
          ref={arquivoRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-label="Arquivo de backup"
          data-testid="arquivo-backup"
          onChange={importar}
        />
        <button type="button" className="btn" onClick={restaurar}>
          <RotateCcw size={18} aria-hidden="true" />
          Restaurar dados de exemplo
        </button>
      </div>
    </section>
  )
}
