import { Gamepad2, GraduationCap, Heart, Leaf, type LucideIcon } from 'lucide-react'
import type { Mode } from '../types'

export interface ModeOption {
  mode: Mode
  icon: LucideIcon
  title: string
  description: string
}

/** Los cuatro modos de exploración. Cada uno cambia el color de acento de toda la app. */
export const MODES: ModeOption[] = [
  { mode: 'aventura', icon: Gamepad2, title: 'Modo aventura', description: 'Captura plantas, colecciona y sube de nivel' },
  { mode: 'descubridor', icon: Leaf, title: 'Paseo tranquilo', description: 'Naturaleza e historia cultural, sin prisa' },
  { mode: 'esencial', icon: Heart, title: 'Solo lo esencial', description: 'Mapa simple con lo imprescindible' },
  { mode: 'educativo', icon: GraduationCap, title: 'Grupo escolar', description: 'Ruta guiada, fichas y test final' },
]

export function getModeOption(mode: Mode): ModeOption {
  return MODES.find((m) => m.mode === mode) ?? MODES[0]
}
