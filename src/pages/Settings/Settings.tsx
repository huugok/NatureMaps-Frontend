import { Globe, Palette, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Page } from '../../components/Page'
import { List } from '../../components/ui/List'
import { ListItem } from '../../components/ui/ListItem'
import { SectionLabel } from '../../components/ui/SectionLabel'
import { StatusDot } from '../../components/ui/StatusDot'
import { getModeOption } from '../../constants/modes'
import { useApp } from '../../context/useApp'
import { LANG_LABELS } from '../../i18n/strings'
import { checkHealth } from '../../services/api'

const SERVER_TEXT = { checking: 'settings.checking', ok: 'settings.online', error: 'settings.offline' } as const

export function Settings() {
  const { mode, lang, t } = useApp()
  const [server, setServer] = useState<'checking' | 'ok' | 'error'>('checking')

  // Comprueba de verdad el backend (GET /health)
  useEffect(() => {
    const ctrl = new AbortController()
    checkHealth(ctrl.signal).then((ok) => !ctrl.signal.aborted && setServer(ok ? 'ok' : 'error'))
    return () => ctrl.abort()
  }, [])

  return (
    <Page title={t('settings.title')} back>
      <List>
        <ListItem icon={Globe} title={t('settings.language')} subtitle={LANG_LABELS[lang]} to="/ajustes/idioma" />
        <ListItem icon={RefreshCw} title={t('settings.changeMode')} subtitle={mode ? t(getModeOption(mode).title) : undefined} to="/modo" />
        <ListItem icon={Palette} title={t('settings.components')} to="/componentes" />
      </List>
      <SectionLabel>{t('settings.server')}</SectionLabel>
      <StatusDot status={server === 'checking' ? 'idle' : server}>{t(SERVER_TEXT[server])}</StatusDot>
    </Page>
  )
}
