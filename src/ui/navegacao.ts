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
}

export const NAVEGACAO: readonly ItemNavegacao[] = [
  { modulo: 'dashboard', rotulo: 'Dashboard', icone: LayoutDashboard },
  { modulo: 'simulador', rotulo: 'Simulador', icone: Calculator },
  { modulo: 'comparador', rotulo: 'Comparador', icone: Scale },
  { modulo: 'clientes', rotulo: 'Clientes', icone: Users },
  { modulo: 'propostas', rotulo: 'Propostas', icone: FileText },
  { modulo: 'grupos', rotulo: 'Grupos e cotas', icone: Layers },
  { modulo: 'configuracoes', rotulo: 'Configurações', icone: Settings },
]
