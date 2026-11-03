import { Gamepad2, GraduationCap, Heart, Leaf, type LucideIcon } from 'lucide-react'
import type { StringKey } from '../i18n/strings'
import type { Mode } from '../types'

export interface ModeOption {
  mode: Mode
  icon: LucideIcon
  titleKey: StringKey
  descriptionKey: StringKey
}

/** Los cuatro modos de exploración. Cada uno cambia el color de acento de toda la app. */
export const MODES: ModeOption[] = [
  { mode: 'aventura', icon: Gamepad2, titleKey: 'mode.aventura', descriptionKey: 'mode.aventura.desc' },
  { mode: 'descubridor', icon: Leaf, titleKey: 'mode.descubridor', descriptionKey: 'mode.descubridor.desc' },
  { mode: 'esencial', icon: Heart, titleKey: 'mode.esencial', descriptionKey: 'mode.esencial.desc' },
  { mode: 'educativo', icon: GraduationCap, titleKey: 'mode.educativo', descriptionKey: 'mode.educativo.desc' },
]

export function getModeOption(mode: Mode): ModeOption {
  return MODES.find((m) => m.mode === mode) ?? MODES[0]
}
