import { Gamepad2, GraduationCap, Heart, Leaf, type LucideIcon } from 'lucide-react'
import type { StringKey } from '../i18n/strings'
import type { Mode } from '../types'

export interface ModeOption {
  mode: Mode
  icon: LucideIcon
  /** Claves de traducción: se pasan por t(). */
  title: StringKey
  description: StringKey
}

/** Los cuatro modos de exploración. Cada uno cambia el color de acento de toda la app. */
export const MODES: ModeOption[] = [
  { mode: 'aventura', icon: Gamepad2, title: 'mode.aventura', description: 'mode.aventura.desc' },
  { mode: 'descubridor', icon: Leaf, title: 'mode.descubridor', description: 'mode.descubridor.desc' },
  { mode: 'esencial', icon: Heart, title: 'mode.esencial', description: 'mode.esencial.desc' },
  { mode: 'educativo', icon: GraduationCap, title: 'mode.educativo', description: 'mode.educativo.desc' },
]

export function getModeOption(mode: Mode): ModeOption {
  return MODES.find((m) => m.mode === mode) ?? MODES[0]
}
