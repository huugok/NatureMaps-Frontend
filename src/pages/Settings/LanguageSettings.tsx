import type { Language } from '../../types/language'
import { LanguagePage } from './LanguagePage'

export interface LanguageSettingsProps {
  language: Language
  onBack: () => void
  onSave: (language: Language) => void
}

/** Ruta /ajustes/idioma: una sola pantalla de idioma con la persistencia de main. */
export function LanguageSettings({ language, onBack, onSave }: LanguageSettingsProps) {
  return <LanguagePage language={language} onBack={onBack} onSave={onSave} />
}
