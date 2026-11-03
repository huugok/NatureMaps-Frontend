import { Search as SearchIcon } from 'lucide-react'
import { useState } from 'react'
import { Page } from '../../components/Page'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { useApp } from '../../context/useApp'

/** Búsqueda. Cuando exista GET /plants en el backend, los resultados irán en lugar del EmptyState. */
export function Search() {
  const { t } = useApp()
  const [query, setQuery] = useState('')
  return (
    <Page title={t('search.title')}>
      <Input icon={SearchIcon} type="search" value={query} placeholder={t('search.placeholder')} onChange={(e) => setQuery(e.target.value)} />
      <EmptyState icon={SearchIcon} title={t('search.empty')} description={t('search.emptyDesc')} />
    </Page>
  )
}
