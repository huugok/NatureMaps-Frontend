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
import { useApp } from '../../context/useApp'

const SWATCHES = ['bg-accent', 'bg-accent-2', 'bg-accent-soft', 'bg-app', 'bg-green', 'bg-warm', 'bg-ink', 'bg-muted']
const FILTERS = ['catalog.filterAll', 'catalog.filterBloom', 'catalog.filterTrees', 'catalog.filterShrubs'] as const

/**
 * Catálogo del sistema de diseño (/componentes).
 * Sirve para que todo el equipo vea qué piezas existen antes de crear una pantalla.
 * Cambia el modo en Ajustes y verás que todos los componentes cambian de color.
 */
export function Components() {
  const { t } = useApp()
  const [on, setOn] = useState(true)
  const [chip, setChip] = useState(0)

  return (
    <Page title={t('catalog.title')} subtitle={t('catalog.subtitle')} back>
      <SectionLabel>{t('catalog.colors')}</SectionLabel>
      <div className="grid grid-cols-4 gap-2">
        {SWATCHES.map((cls) => (
          <div key={cls} className={`h-11 rounded-control border border-line ${cls}`} title={cls} />
        ))}
      </div>

      <SectionLabel>Button</SectionLabel>
      <Button block>{t('catalog.primary')}</Button>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" icon={MapPin}>
          {t('catalog.secondary')}
        </Button>
        <Button variant="ghost">Ghost</Button>
        <Button size="sm">{t('catalog.small')}</Button>
      </div>

      <SectionLabel>IconButton · Badge · StatusDot</SectionLabel>
      <div className="flex flex-wrap items-center gap-2">
        <IconButton icon={ArrowLeft} label={t('common.back')} />
        <IconButton icon={SettingsIcon} label={t('settings.title')} variant="accent" />
        <Badge>{t('catalog.label')}</Badge>
        <Badge solid>{t('catalog.solid')}</Badge>
        <StatusDot status="ok">{t('catalog.ok')}</StatusDot>
        <StatusDot status="error">{t('catalog.error')}</StatusDot>
      </div>

      <SectionLabel>Chip</SectionLabel>
      <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
        {FILTERS.map((key, i) => (
          <Chip key={key} active={chip === i} onClick={() => setChip(i)}>
            {t(key)}
          </Chip>
        ))}
      </div>

      <SectionLabel>Input</SectionLabel>
      <Input icon={Leaf} placeholder={t('catalog.search')} />

      <SectionLabel>ListItem</SectionLabel>
      <List>
        <ListItem icon={Leaf} title={t('catalog.itemNav')} subtitle={t('catalog.itemNavDesc')} to="/componentes" />
        <ListItem icon={Bell} title={t('catalog.itemSwitch')} trailing={<Switch checked={on} onChange={setOn} label={t('catalog.example')} />} />
        <ListItem title={t('catalog.selected')} selected trailing={<Radio checked />} />
      </List>

      <SectionLabel>Card</SectionLabel>
      <Card>{t('catalog.card')}</Card>
      <Card variant="accent">{t('catalog.cardAccent')}</Card>

      <SectionLabel>EmptyState</SectionLabel>
      <Card>
        <EmptyState icon={Route} title={t('catalog.emptyTitle')} description={t('catalog.emptyDesc')} />
      </Card>
    </Page>
  )
}
