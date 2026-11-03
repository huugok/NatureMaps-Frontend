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
  const { mode } = useApp()
  if (!mode) return <Navigate to="/modo" replace />

  const option = getModeOption(mode)

  return (
    <Page
      title="Hola, explorador"
      subtitle="Tu guía botánica y cultural de Valencia"
    >
      <Badge solid>{option.title.toUpperCase()}</Badge>

      <Card variant="accent">
        <p className="text-heading font-bold">Nature MAPS</p>
        <p className="mt-1 text-small opacity-85">{option.description}</p>
      </Card>

      <List>
        <ListItem icon={ScanLine} title="Identificar una planta" to="/escanear" />
        <ListItem icon={Leaf} title="Ver el mapa" to="/mapa" />
        <ListItem icon={Route} title="Explorar rutas" to="/rutas" />
        <ListItem icon={Flower2} title="Ficha de planta" subtitle="Catálogo botánico conectado" to="/ficha" />
      </List>
    </Page>
  )
}
