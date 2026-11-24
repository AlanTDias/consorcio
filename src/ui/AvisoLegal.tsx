export const TEXTO_AVISO_LEGAL =
  'Simulação ilustrativa. Valores sujeitos às condições do grupo e da administradora. Consórcio regulado pelo Banco Central (Lei 11.795/2008).'

export function AvisoLegal() {
  return <p className="aviso-legal">{TEXTO_AVISO_LEGAL}</p>
}
