import { ArrowLeft, Bell, Leaf, MapPin, Route, Settings as SettingsIcon } from 'lucide-react'
import { useState } from 'react'
import { Page } from '../../components/Page'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Chip } from '../../components/ui/Chip'
import { EmptyState } from '../../components/ui/EmptyState'
import { IconButton } from '../../components/ui/IconButton'
import { Input } from '../../components/ui/Input'
import { List } from '../../components/ui/List'
import { ListItem } from '../../components/ui/ListItem'
import { Radio } from '../../components/ui/Radio'
import { SectionLabel } from '../../components/ui/SectionLabel'
import { StatusDot } from '../../components/ui/StatusDot'
import { Switch } from '../../components/ui/Switch'

const SWATCHES = ['bg-accent', 'bg-accent-2', 'bg-accent-soft', 'bg-app', 'bg-green', 'bg-warm', 'bg-ink', 'bg-muted']
const FILTERS = ['Todas', 'En floración', 'Árboles', 'Arbustos']

/**
 * Catálogo del sistema de diseño (/componentes).
 * Sirve para que todo el equipo vea qué piezas existen antes de crear una pantalla.
 * Cambia el modo en Ajustes y verás que todos los componentes cambian de color.
 */
export function Components() {
  const [on, setOn] = useState(true)
  const [chip, setChip] = useState(0)

  return (
    <Page title="Componentes" subtitle="Sistema de diseño de Nature MAPS" back>
      <SectionLabel>Colores (tokens)</SectionLabel>
      <div className="grid grid-cols-4 gap-2">
        {SWATCHES.map((cls) => (
          <div key={cls} className={`h-11 rounded-control border border-line ${cls}`} title={cls} />
        ))}
      </div>

      <SectionLabel>Button</SectionLabel>
      <Button block>Primario</Button>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" icon={MapPin}>
          Secundario
        </Button>
        <Button variant="ghost">Ghost</Button>
        <Button size="sm">Pequeño</Button>
      </div>

      <SectionLabel>IconButton · Badge · StatusDot</SectionLabel>
      <div className="flex flex-wrap items-center gap-2">
        <IconButton icon={ArrowLeft} label="Volver" />
        <IconButton icon={SettingsIcon} label="Ajustes" variant="accent" />
        <Badge>Etiqueta</Badge>
        <Badge solid>Sólida</Badge>
        <StatusDot status="ok">OK</StatusDot>
        <StatusDot status="error">Error</StatusDot>
      </div>

      <SectionLabel>Chip</SectionLabel>
      <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
        {FILTERS.map((label, i) => (
          <Chip key={label} active={chip === i} onClick={() => setChip(i)}>
            {label}
          </Chip>
        ))}
      </div>

      <SectionLabel>Input</SectionLabel>
      <Input icon={Leaf} placeholder="Buscar…" />

      <SectionLabel>ListItem</SectionLabel>
      <List>
        <ListItem icon={Leaf} title="Con icono y flecha" subtitle="Navega a otra pantalla" to="/componentes" />
        <ListItem icon={Bell} title="Con interruptor" trailing={<Switch checked={on} onChange={setOn} label="Ejemplo" />} />
        <ListItem title="Seleccionado" selected trailing={<Radio checked />} />
      </List>

      <SectionLabel>Card</SectionLabel>
      <Card>Tarjeta normal para agrupar contenido.</Card>
      <Card variant="accent">Tarjeta destacada con el color del modo.</Card>

      <SectionLabel>EmptyState</SectionLabel>
      <Card>
        <EmptyState icon={Route} title="Sin datos todavía" description="Se muestra mientras una lista está vacía." />
      </Card>
    </Page>
  )
}
