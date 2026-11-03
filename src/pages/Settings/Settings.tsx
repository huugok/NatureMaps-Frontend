import { Languages, Palette, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Page } from '../../components/Page'
import { List } from '../../components/ui/List'
import { ListItem } from '../../components/ui/ListItem'
import { SectionLabel } from '../../components/ui/SectionLabel'
import { StatusDot } from '../../components/ui/StatusDot'
import { getModeOption } from '../../constants/modes'
import { useApp } from '../../context/useApp'
import { checkHealth } from '../../services/api'
import { LANGUAGE_NAMES } from '../../types/language'
import type { Language } from '../../types/language'

export interface SettingsProps {
  language: Language
  onBack: () => void
}

export function Settings({ language, onBack }: SettingsProps) {
  const { mode, t } = useApp()
  const [server, setServer] = useState<'checking' | 'ok' | 'error'>('checking')

  // Comprueba de verdad el backend (GET /health)
  useEffect(() => {
    const ctrl = new AbortController()
    checkHealth(ctrl.signal).then((ok) => !ctrl.signal.aborted && setServer(ok ? 'ok' : 'error'))
    return () => ctrl.abort()
  }, [])

  const serverText = {
    checking: t('settings.checking'),
    ok: t('settings.online'),
    error: t('settings.offline'),
  }[server]

  return (
    <Page title={t('settings.title')} back onBack={onBack} settings={false}>
      <List>
        <ListItem icon={Languages} title={t('settings.language')} subtitle={LANGUAGE_NAMES[language]} to="/ajustes/idioma" />
        <ListItem
          icon={RefreshCw}
          title={t('settings.changeMode')}
          subtitle={mode ? t(getModeOption(mode).titleKey) : undefined}
          to="/modo"
        />
        <ListItem icon={Palette} title={t('settings.components')} to="/componentes" />
      </List>
      <SectionLabel>{t('settings.server')}</SectionLabel>
      <StatusDot status={server === 'checking' ? 'idle' : server}>{serverText}</StatusDot>
    </Page>
  )
}
