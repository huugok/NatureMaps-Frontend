import { Leaf, Route, ScanLine, Settings as SettingsIcon } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Page } from '../../components/Page'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { IconButton } from '../../components/ui/IconButton'
import { List } from '../../components/ui/List'
import { ListItem } from '../../components/ui/ListItem'
import { getModeOption } from '../../constants/modes'
import { useApp } from '../../context/useApp'

/** Inicio. Cada modo podrá tener su propio contenido debajo de los accesos. */
export function Home() {
  const { mode, t } = useApp()
  const navigate = useNavigate()
  if (!mode) return <Navigate to="/modo" replace />

  const option = getModeOption(mode)

  return (
    <Page
      title={t('home.title')}
      subtitle={t('home.subtitle')}
      actions={<IconButton icon={SettingsIcon} label={t('settings.title')} variant="accent" onClick={() => navigate('/ajustes')} />}
    >
      <Badge solid>{t(option.title).toUpperCase()}</Badge>

      <Card variant="accent">
        <p className="text-heading font-bold">Nature MAPS</p>
        <p className="mt-1 text-small opacity-85">{t(option.description)}</p>
      </Card>

      <List>
        <ListItem icon={ScanLine} title={t('home.scan')} to="/escanear" />
        <ListItem icon={Leaf} title={t('home.map')} to="/mapa" />
        <ListItem icon={Route} title={t('home.routes')} to="/rutas" />
      </List>
    </Page>
  )
}
