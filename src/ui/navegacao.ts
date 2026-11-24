import {
  Calculator,
  FileText,
  Layers,
  LayoutDashboard,
  Scale,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { Modulo } from '../auth/permissoes'

export interface ItemNavegacao {
  modulo: Modulo
  rotulo: string
  icone: LucideIcon
  etapa: number
}

export const NAVEGACAO: readonly ItemNavegacao[] = [
  { modulo: 'dashboard', rotulo: 'Dashboard', icone: LayoutDashboard, etapa: 4 },
  { modulo: 'simulador', rotulo: 'Simulador', icone: Calculator, etapa: 2 },
  { modulo: 'comparador', rotulo: 'Comparador', icone: Scale, etapa: 2 },
  { modulo: 'clientes', rotulo: 'Clientes', icone: Users, etapa: 3 },
  { modulo: 'propostas', rotulo: 'Propostas', icone: FileText, etapa: 3 },
  { modulo: 'grupos', rotulo: 'Grupos e cotas', icone: Layers, etapa: 4 },
  { modulo: 'configuracoes', rotulo: 'Configurações', icone: Settings, etapa: 1 },
]
