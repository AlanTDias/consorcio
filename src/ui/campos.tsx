import { useId, useState, type ReactNode } from 'react'
import { CircleAlert, CircleCheck } from 'lucide-react'

interface BaseCampo {
  rotulo: string
  erro?: string | undefined
  ajuda?: ReactNode
  desabilitado?: boolean
}

function Moldura({
  id,
  rotulo,
  erro,
  ajuda,
  children,
}: BaseCampo & { id: string; children: ReactNode }) {
  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      {children}
      {ajuda && !erro && (
        <span id={`${id}-ajuda`} className="ajuda-campo">
          {ajuda}
        </span>
      )}
      {erro && (
        <span id={`${id}-erro`} className="erro-campo">
          {erro}
        </span>
      )}
    </div>
  )
}

function descricao(id: string, erro?: string, ajuda?: ReactNode) {
  if (erro) return `${id}-erro`
  if (ajuda) return `${id}-ajuda`
  return undefined
}

const milhar = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

export function CampoMoeda({
  rotulo,
  valor,
  aoMudar,
  erro,
  ajuda,
  desabilitado,
  testId,
}: BaseCampo & { valor: number; aoMudar(valor: number): void; testId?: string }) {
  const id = useId()
  return (
    <Moldura id={id} rotulo={rotulo} erro={erro} ajuda={ajuda}>
      <div className="campo-entrada">
        <span className="prefixo-campo" aria-hidden="true">
          R$
        </span>
        <input
          id={id}
          className="entrada entrada-com-prefixo"
          inputMode="numeric"
          autoComplete="off"
          value={valor > 0 ? milhar.format(valor) : ''}
          maxLength={15}
          disabled={desabilitado}
          data-testid={testId}
          aria-invalid={!!erro}
          aria-describedby={descricao(id, erro, ajuda)}
          onChange={(e) => {
            const digitos = e.target.value.replace(/\D/g, '').slice(0, 11)
            aoMudar(digitos ? Number(digitos) : 0)
          }}
        />
      </div>
    </Moldura>
  )
}

function paraTexto(valor: number): string {
  return Number.isFinite(valor) ? String(valor).replace('.', ',') : ''
}

export function CampoNumero({
  rotulo,
  valor,
  aoMudar,
  erro,
  ajuda,
  desabilitado,
  sufixo,
  decimais = false,
  testId,
}: BaseCampo & {
  valor: number
  aoMudar(valor: number): void
  sufixo?: string
  decimais?: boolean
  testId?: string
}) {
  const id = useId()
  const [texto, setTexto] = useState(paraTexto(valor))
  const [ultimoValor, setUltimoValor] = useState(valor)

  if (!Object.is(valor, ultimoValor)) {
    setUltimoValor(valor)
    const atual = Number(texto.replace(',', '.'))
    if (atual !== valor && !(Number.isNaN(valor) && texto === '')) setTexto(paraTexto(valor))
  }

  return (
    <Moldura id={id} rotulo={rotulo} erro={erro} ajuda={ajuda}>
      <div className="campo-entrada">
        <input
          id={id}
          className={`entrada${sufixo ? ' entrada-com-sufixo' : ''}`}
          inputMode={decimais ? 'decimal' : 'numeric'}
          autoComplete="off"
          value={texto}
          maxLength={10}
          disabled={desabilitado}
          data-testid={testId}
          aria-invalid={!!erro}
          aria-describedby={descricao(id, erro, ajuda)}
          onChange={(e) => {
            const limpo = decimais
              ? e.target.value.replace(/[^\d,.-]/g, '').replace('.', ',')
              : e.target.value.replace(/\D/g, '')
            setTexto(limpo)
            const numero = limpo === '' ? Number.NaN : Number(limpo.replace(',', '.'))
            setUltimoValor(numero)
            aoMudar(numero)
          }}
        />
        {sufixo && (
          <span className="sufixo-campo" aria-hidden="true">
            {sufixo}
          </span>
        )}
      </div>
    </Moldura>
  )
}

export function CampoSelecao<T extends string>({
  rotulo,
  valor,
  opcoes,
  aoMudar,
  erro,
  desabilitado,
}: BaseCampo & {
  valor: T
  opcoes: readonly { valor: T; rotulo: string }[]
  aoMudar(valor: T): void
}) {
  const id = useId()
  return (
    <Moldura id={id} rotulo={rotulo} erro={erro}>
      <select
        id={id}
        className="entrada"
        value={valor}
        disabled={desabilitado}
        aria-invalid={!!erro}
        onChange={(e) => aoMudar(e.target.value as T)}
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </Moldura>
  )
}

export function CampoTexto({
  rotulo,
  valor,
  aoMudar,
  erro,
  ajuda,
  desabilitado,
  tipo = 'text',
  maximo = 120,
  multilinha = false,
  autoComplete = 'off',
}: BaseCampo & {
  valor: string
  aoMudar(valor: string): void
  tipo?: 'text' | 'email' | 'tel' | 'date'
  maximo?: number
  multilinha?: boolean
  autoComplete?: string
}) {
  const id = useId()
  const comum = {
    id,
    className: 'entrada',
    value: valor,
    maxLength: maximo,
    disabled: desabilitado,
    autoComplete,
    'aria-invalid': !!erro,
    'aria-describedby': descricao(id, erro, ajuda),
  }
  return (
    <Moldura id={id} rotulo={rotulo} erro={erro} ajuda={ajuda}>
      {multilinha ? (
        <textarea {...comum} rows={3} onChange={(e) => aoMudar(e.target.value)} />
      ) : (
        <input {...comum} type={tipo} onChange={(e) => aoMudar(e.target.value)} />
      )}
    </Moldura>
  )
}

export function Segmentado<T extends string>({
  rotulo,
  valor,
  opcoes,
  aoMudar,
}: {
  rotulo: string
  valor: T
  opcoes: readonly { valor: T; rotulo: string }[]
  aoMudar(valor: T): void
}) {
  return (
    <fieldset className="segmentado">
      <legend>{rotulo}</legend>
      <div className="segmentado-opcoes">
        {opcoes.map((o) => (
          <button
            key={o.valor}
            type="button"
            className="segmentado-opcao"
            aria-pressed={o.valor === valor}
            onClick={() => aoMudar(o.valor)}
          >
            {o.rotulo}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export function Interruptor({
  rotulo,
  ligado,
  aoMudar,
  descricao: texto,
}: {
  rotulo: string
  ligado: boolean
  aoMudar(ligado: boolean): void
  descricao?: ReactNode
}) {
  return (
    <label className="interruptor">
      <input
        type="checkbox"
        role="switch"
        checked={ligado}
        onChange={(e) => aoMudar(e.target.checked)}
      />
      <span className="interruptor-trilho" aria-hidden="true" />
      <span className="interruptor-texto">
        <span>{rotulo}</span>
        {texto && <span className="texto-secundario">{texto}</span>}
      </span>
    </label>
  )
}

export type Mensagem = { tipo: 'sucesso' | 'erro'; texto: string } | null

export function Aviso({ mensagem }: { mensagem: NonNullable<Mensagem> }) {
  const Icone = mensagem.tipo === 'sucesso' ? CircleCheck : CircleAlert
  return (
    <div
      className={`alerta alerta-${mensagem.tipo}`}
      role={mensagem.tipo === 'erro' ? 'alert' : 'status'}
    >
      <Icone size={18} aria-hidden="true" />
      <span>{mensagem.texto}</span>
    </div>
  )
}

export function CabecalhoPagina({
  titulo,
  subtitulo,
  acoes,
}: {
  titulo: string
  subtitulo?: string
  acoes?: ReactNode
}) {
  return (
    <header className="cabecalho-pagina">
      <div>
        <h1>{titulo}</h1>
        {subtitulo && <p className="texto-secundario">{subtitulo}</p>}
      </div>
      {acoes && <div className="acoes">{acoes}</div>}
    </header>
  )
}
