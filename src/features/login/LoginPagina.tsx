import { useEffect, useId, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { CircleAlert, Eye, EyeOff, FlaskConical, Lock, LogIn, Mail, UserRound } from 'lucide-react'
import { z } from 'zod'
import { ErroAutenticacao } from '../../auth/AuthService'
import { useAuth, useServicos } from '../../contexto'
import type { Usuario } from '../../data/esquemas'
import { AvisoLegal } from '../../ui/AvisoLegal'
import { Logo } from '../../ui/Logo'
import { FundoConquista } from './FundoConquista'
import './login.css'

const formularioSchema = z.object({
  email: z.email('Informe um e-mail válido.'),
  senha: z.string().min(1, 'Informe a senha.').max(100),
})

type ErrosCampo = Partial<Record<'email' | 'senha', string>>

export function LoginPagina({ nomeSistema }: { nomeSistema: string }) {
  const { sessao, entrar } = useAuth()
  const { repositorios } = useServicos()
  const navegar = useNavigate()
  const id = useId()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [lembrar, setLembrar] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [errosCampo, setErrosCampo] = useState<ErrosCampo>({})
  const [erroGeral, setErroGeral] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [demos, setDemos] = useState<Usuario[]>([])

  useEffect(() => {
    repositorios.usuarios.listar().then(setDemos)
  }, [repositorios])

  if (sessao) return <Navigate to="/dashboard" replace />

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErroGeral('')
    const resultado = formularioSchema.safeParse({ email: email.trim(), senha })
    if (!resultado.success) {
      const erros: ErrosCampo = {}
      for (const problema of resultado.error.issues) {
        const campo = problema.path[0]
        if ((campo === 'email' || campo === 'senha') && !erros[campo])
          erros[campo] = problema.message
      }
      setErrosCampo(erros)
      return
    }
    setErrosCampo({})
    setEnviando(true)
    try {
      await entrar({ ...resultado.data, lembrar })
      navegar('/dashboard', { replace: true })
    } catch (erro) {
      setErroGeral(
        erro instanceof ErroAutenticacao
          ? erro.message
          : 'Não foi possível entrar. Tente novamente.',
      )
    } finally {
      setEnviando(false)
    }
  }

  function usarDemo(usuario: Usuario) {
    setEmail(usuario.email)
    setSenha(usuario.senhaDemo)
    setErrosCampo({})
    setErroGeral('')
  }

  return (
    <div className="login">
      <FundoConquista />
      <main className="login-card">
        <div className="login-cabecalho">
          <Logo nome={nomeSistema} tamanho={44} />
          <h1>Bem-vindo de volta</h1>
          <p className="texto-secundario">Entre para simular, propor e acompanhar suas vendas.</p>
        </div>

        <div className="alerta alerta-aviso" role="note">
          <FlaskConical size={18} aria-hidden="true" />
          <span>
            <strong>Ambiente de demonstração.</strong> Este login não é uma autenticação real: não
            use senhas nem dados verdadeiros.
          </span>
        </div>

        <form className="login-form" onSubmit={aoEnviar} noValidate>
          {erroGeral && (
            <div className="alerta alerta-erro" role="alert">
              <CircleAlert size={18} aria-hidden="true" />
              <span>{erroGeral}</span>
            </div>
          )}

          <div className="campo">
            <label htmlFor={`${id}-email`}>E-mail</label>
            <div className="campo-entrada">
              <Mail className="icone-campo" size={18} aria-hidden="true" />
              <input
                id={`${id}-email`}
                className="entrada"
                type="email"
                autoComplete="username"
                placeholder="voce@exemplo.test"
                value={email}
                maxLength={120}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!errosCampo.email}
                aria-describedby={errosCampo.email ? `${id}-email-erro` : undefined}
              />
            </div>
            {errosCampo.email && (
              <span id={`${id}-email-erro`} className="erro-campo">
                {errosCampo.email}
              </span>
            )}
          </div>

          <div className="campo">
            <label htmlFor={`${id}-senha`}>Senha</label>
            <div className="campo-entrada">
              <Lock className="icone-campo" size={18} aria-hidden="true" />
              <input
                id={`${id}-senha`}
                className="entrada entrada-senha"
                type={mostrarSenha ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Sua senha"
                value={senha}
                maxLength={100}
                onChange={(e) => setSenha(e.target.value)}
                aria-invalid={!!errosCampo.senha}
                aria-describedby={errosCampo.senha ? `${id}-senha-erro` : undefined}
              />
              <button
                type="button"
                className="btn btn-icone alternar-senha"
                onClick={() => setMostrarSenha((v) => !v)}
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={mostrarSenha}
              >
                {mostrarSenha ? (
                  <EyeOff size={18} aria-hidden="true" />
                ) : (
                  <Eye size={18} aria-hidden="true" />
                )}
              </button>
            </div>
            {errosCampo.senha && (
              <span id={`${id}-senha-erro`} className="erro-campo">
                {errosCampo.senha}
              </span>
            )}
          </div>

          <label className="caixa-marcar">
            <input
              type="checkbox"
              checked={lembrar}
              onChange={(e) => setLembrar(e.target.checked)}
            />
            Lembrar de mim
          </label>

          <button type="submit" className="btn btn-primario btn-bloco" disabled={enviando}>
            <LogIn size={18} aria-hidden="true" />
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <section className="login-demos" aria-labelledby={`${id}-demos`}>
          <h2 id={`${id}-demos`}>Usuários de demonstração</h2>
          <p className="texto-secundario">Clique para preencher. Senha de todos: demo123</p>
          <ul>
            {demos.map((u) => (
              <li key={u.id}>
                <button type="button" className="demo-usuario" onClick={() => usarDemo(u)}>
                  <UserRound size={18} aria-hidden="true" />
                  <span>
                    <strong>{u.perfil}</strong>
                    <span className="texto-secundario">{u.email}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <footer className="login-rodape">
        <AvisoLegal />
      </footer>
    </div>
  )
}
