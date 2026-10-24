import { Palette, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Page } from '../../components/Page'
import { List } from '../../components/ui/List'
import { ListItem } from '../../components/ui/ListItem'
import { SectionLabel } from '../../components/ui/SectionLabel'
import { StatusDot } from '../../components/ui/StatusDot'
import { getModeOption } from '../../constants/modes'
import { useApp } from '../../context/useApp'
import { checkHealth } from '../../services/api'

const SERVER_TEXT = { checking: 'Comprobando…', ok: 'Conectado', error: 'Sin conexión' }

export function Settings() {
  const { mode } = useApp()
  const [server, setServer] = useState<'checking' | 'ok' | 'error'>('checking')

  // Comprueba de verdad el backend (GET /health)
  useEffect(() => {
    const ctrl = new AbortController()
    checkHealth(ctrl.signal).then((ok) => !ctrl.signal.aborted && setServer(ok ? 'ok' : 'error'))
    return () => ctrl.abort()
  }, [])

  return (
    <Page title="Ajustes" back>
      <List>
        <ListItem icon={RefreshCw} title="Cambiar de modo" subtitle={mode ? getModeOption(mode).title : undefined} to="/modo" />
        <ListItem icon={Palette} title="Catálogo de componentes" to="/componentes" />
      </List>
      <SectionLabel>Servidor</SectionLabel>
      <StatusDot status={server === 'checking' ? 'idle' : server}>{SERVER_TEXT[server]}</StatusDot>
    </Page>
  )
}
