import { ShieldX } from 'lucide-react'

export function AcessoNegado() {
  return (
    <section>
      <header className="cabecalho-pagina">
        <h1>Acesso não permitido</h1>
      </header>
      <div className="card estado-vazio">
        <ShieldX size={32} aria-hidden="true" />
        <p>Seu perfil não tem acesso a este conteúdo.</p>
      </div>
    </section>
  )
}
