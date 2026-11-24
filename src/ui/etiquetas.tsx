import type { EtapaFunil, StatusProposta } from '../data/esquemas'
import { ROTULO_ETAPA, ROTULO_STATUS } from '../data/operacoes'

const CLASSE_ETAPA: Record<EtapaFunil, string> = {
  lead: 'etiqueta',
  proposta: 'etiqueta etiqueta-ativa',
  venda: 'etiqueta etiqueta-sucesso',
}

const CLASSE_STATUS: Record<StatusProposta, string> = {
  aberta: 'etiqueta',
  enviada: 'etiqueta etiqueta-ativa',
  aceita: 'etiqueta etiqueta-sucesso',
  recusada: 'etiqueta etiqueta-erro',
}

export function EtiquetaEtapa({ etapa }: { etapa: EtapaFunil }) {
  return <span className={CLASSE_ETAPA[etapa]}>{ROTULO_ETAPA[etapa]}</span>
}

export function EtiquetaStatus({ status }: { status: StatusProposta }) {
  return <span className={CLASSE_STATUS[status]}>{ROTULO_STATUS[status]}</span>
}

export function Carregando() {
  return (
    <p className="texto-secundario" role="status">
      Carregando…
    </p>
  )
}
