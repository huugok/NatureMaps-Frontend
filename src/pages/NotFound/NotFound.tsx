import { Page } from '../../components/Page'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { useApp } from '../../context/useApp'

export function NotFound() {
  const { t } = useApp()
  return (
    <Page title="404">
      <EmptyState title={t('common.notFound')} action={<Button to="/inicio">{t('common.goHome')}</Button>} />
    </Page>
  )
}
