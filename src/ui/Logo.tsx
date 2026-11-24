interface Props {
  nome: string
  tamanho?: number
}

export function Logo({ nome, tamanho = 36 }: Props) {
  return (
    <span className="logo">
      <svg width={tamanho} height={tamanho} viewBox="0 0 40 40" aria-hidden="true">
        <rect width="40" height="40" rx="10" fill="#FF6A13" />
        <path d="M20 8.5 31.5 18v13.5h-23V18Z" fill="#1C1F24" />
        <circle cx="20" cy="21.5" r="3.2" fill="#FF6A13" />
        <path d="M18.4 23.6h3.2l.9 5.4h-5z" fill="#FF6A13" />
      </svg>
      <span className="logo-nome">{nome}</span>
    </span>
  )
}
