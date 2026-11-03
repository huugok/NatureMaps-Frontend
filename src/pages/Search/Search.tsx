import { Search as SearchIcon } from 'lucide-react'
import { useState } from 'react'
import { Page } from '../../components/Page'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'

/** Búsqueda. Cuando exista GET /plants en el backend, los resultados irán en lugar del EmptyState. */
export function Search() {
  const [query, setQuery] = useState('')
  return (
    <Page title="Buscar">
      <Input icon={SearchIcon} type="search" value={query} placeholder="Buscar una planta…" onChange={(e) => setQuery(e.target.value)} />
      <EmptyState icon={SearchIcon} title="Aún no hay plantas disponibles" description="Aparecerán aquí cuando el backend sirva el catálogo." />
    </Page>
  )
}
