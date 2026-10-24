import { Route } from 'lucide-react'
import { Page } from '../../components/Page'
import { EmptyState } from '../../components/ui/EmptyState'
import { useApp } from '../../context/useApp'

/** Rutas. Cuando exista GET /routes en el backend, la lista irá en lugar del EmptyState. */
export function RoutesList() {
  const { t } = useApp()
  return (
    <Page title={t('routes.title')}>
      <EmptyState icon={Route} title={t('routes.empty')} description={t('routes.emptyDesc')} />
    </Page>
  )
}
