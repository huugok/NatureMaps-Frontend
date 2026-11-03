import { Flower2, Leaf, Route, ScanLine } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { Page } from '../../components/Page'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { List } from '../../components/ui/List'
import { ListItem } from '../../components/ui/ListItem'
import { getModeOption } from '../../constants/modes'
import { useApp } from '../../context/useApp'

/** Inicio. Cada modo podrá tener su propio contenido debajo de los accesos. */
export function Home() {
  const { mode, t } = useApp()
  if (!mode) return <Navigate to="/modo" replace />

  const option = getModeOption(mode)

  return (
    <Page
      title={t('home.title')}
      subtitle={t('home.subtitle')}
    >
      <Badge solid>{t(option.titleKey).toUpperCase()}</Badge>

      <Card variant="accent">
        <p className="font-display text-heading">Nature MAPS</p>
        <p className="mt-1 text-small opacity-85">{t(option.descriptionKey)}</p>
      </Card>

      <List>
        <ListItem icon={ScanLine} title={t('home.scan')} to="/escanear" />
        <ListItem icon={Leaf} title={t('home.map')} to="/mapa" />
        <ListItem icon={Route} title={t('home.routes')} to="/rutas" />
        <ListItem icon={Flower2} title={t('home.ficha')} subtitle={t('home.fichaDesc')} to="/ficha" />
      </List>
    </Page>
  )
}
