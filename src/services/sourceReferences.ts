import type { FichaFuente } from '../pages/FichaPlanta/types';
import type { SourceReference } from '../types/sourceReference';

/** Undefined means an older API: retain the existing source mapping. */
export function sourceReferencesForView(references: SourceReference[] | undefined): { sources?: FichaFuente[] } {
  if (!references?.length) return {};
  const sources: FichaFuente[] = [];
  for (const reference of references) {
    let url: URL;
    try { url = new URL(reference.url); } catch { continue; }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') continue;
    sources.push({
      name: reference.name,
      description: reference.description,
      url: reference.url,
      icon: reference.scope === 'inventory' ? 'landmark' : 'search',
      provenance: reference,
    });
  }
  return sources.length ? { sources } : {};
}
