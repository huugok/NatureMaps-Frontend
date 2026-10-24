import { Page } from '../../components/Page'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'

export function NotFound() {
  return (
    <Page title="404">
      <EmptyState title="Pantalla no encontrada" action={<Button to="/inicio">Ir al inicio</Button>} />
    </Page>
  )
}
