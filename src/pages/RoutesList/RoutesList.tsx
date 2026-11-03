import { Route } from 'lucide-react'
import { Page } from '../../components/Page'
import { EmptyState } from '../../components/ui/EmptyState'

/** Rutas. Cuando exista GET /routes en el backend, la lista irá en lugar del EmptyState. */
export function RoutesList() {
  return (
    <Page title="Rutas">
      <EmptyState icon={Route} title="Aún no hay rutas" description="Las rutas botánicas y culturales aparecerán aquí." />
    </Page>
  )
}
