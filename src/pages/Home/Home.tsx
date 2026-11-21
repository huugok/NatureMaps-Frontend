import { BookOpen, Flower2, Leaf, Route, ScanLine } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Page } from '../../components/Page'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { List } from '../../components/ui/List'
import { ListItem } from '../../components/ui/ListItem'
import { getModeOption } from '../../constants/modes'
import { useApp } from '../../context/useApp'
import { getFloweringSpecies } from '../../services/ficha'
import type { FichaListItem } from '../../services/ficha'
import { commonNameFor } from '../../services/ficha'
import { repairTextEncoding } from '../../i18n/format'

/** Inicio. Cada modo podrá tener su propio contenido debajo de los accesos. */
export function Home() {
  const { mode, lang, t } = useApp()
  const [featuredPlants, setFeaturedPlants] = useState<FichaListItem[]>([])
  const [featuredIndex, setFeaturedIndex] = useState(0)

  useEffect(() => {
    let cancelled = false
    getFloweringSpecies(new Date().getMonth() + 1, lang)
      .then((items) => {
        if (!cancelled) {
          setFeaturedPlants(items)
          setFeaturedIndex(0)
        }
      })
      .catch(() => { if (!cancelled) setFeaturedPlants([]) })
    return () => { cancelled = true }
  }, [lang])

  useEffect(() => {
    if (featuredPlants.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const interval = window.setInterval(() => {
      setFeaturedIndex((index) => (index + 1) % featuredPlants.length)
    }, 5000)
    return () => window.clearInterval(interval)
  }, [featuredPlants])

  if (!mode) return <Navigate to="/modo" replace />

  const option = getModeOption(mode)
  const featured = featuredPlants[featuredIndex] ?? null

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

      <Link to="/floracion" aria-label={t('home.floweringCard')} className="group relative block h-40 overflow-hidden rounded-card bg-night shadow-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        {featured?.image?.url && <img key={featured.id} src={featured.image.url} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105" />}
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <p className="font-display text-heading">{t('home.floweringCard')}</p>
          <p key={featured?.id ?? 'empty'} className="mt-1 text-small">
            {featured ? repairTextEncoding(commonNameFor(featured.names, lang) ?? featured.scientificName) : t('home.floweringCardDesc')}
          </p>
        </div>
      </Link>

      <List>
        <ListItem icon={ScanLine} title={t('home.scan')} to="/escanear" />
        <ListItem icon={Leaf} title={t('home.map')} to="/mapa" />
        <ListItem icon={Route} title={t('home.routes')} to="/rutas" />
        <ListItem icon={Flower2} title={t('home.ficha')} subtitle={t('home.fichaDesc')} to="/ficha" />
        <ListItem icon={BookOpen} title={t('home.discover')} subtitle={t('home.discoverDesc')} to="/descubre" />
      </List>
    </Page>
  )
}
