import { Construction, ShieldX } from 'lucide-react'

export function EmBreve({ titulo, etapa }: { titulo: string; etapa: number }) {
  return (
    <section>
      <header className="cabecalho-pagina">
        <h1>{titulo}</h1>
      </header>
      <div className="card estado-vazio">
        <Construction size={32} aria-hidden="true" />
        <p>Este módulo será entregue na etapa {etapa}.</p>
      </div>
    </section>
  )
}

export function AcessoNegado() {
  return (
    <section>
      <header className="cabecalho-pagina">
        <h1>Acesso não permitido</h1>
      </header>
      <div className="card estado-vazio">
        <ShieldX size={32} aria-hidden="true" />
        <p>Seu perfil não tem acesso a este módulo.</p>
      </div>
    </section>
  )
}
