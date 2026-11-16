import { BookOpen, Landmark, Leaf, MapPin, Sprout, Trees } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { Page } from '../../components/Page';
import { RemoteError, RemoteLoading } from '../../components/RemoteStatus';
import { Button } from '../../components/ui/Button';
import { List } from '../../components/ui/List';
import { ListItem } from '../../components/ui/ListItem';
import { useApp } from '../../context/useApp';
import { useRemote } from '../../hooks/useRemote';
import { formatArea, formatCount } from '../../i18n/format';
import { fetchGreenAreaDetail } from '../../services/greenAreas';
import type { GreenAreaDetail } from '../../types/greenArea';

/**
 * Ficha de una zona verde (NM-08): qué es, qué flora tiene, qué puntos de
 * interés hay dentro y qué artículos hablan de ella. Es el destino de los
 * enlaces desde la ficha de planta (PA 3013), la ficha de POI (PA 3012) y el
 * contorno tocado en el mapa (PA 3011).
 */
export function GreenAreaPage() {
  const { t, lang } = useApp();
  const { grupo = '' } = useParams();
  const { state, retry } = useRemote<GreenAreaDetail>(
    `${lang}|${grupo}`,
    (signal) => fetchGreenAreaDetail(grupo, lang, signal),
  );

  if (state.status !== 'ready') {
    return (
      <Page title={t('discover.topic.parques')} back>
        {state.status === 'loading'
          ? <RemoteLoading message={t('area.loading')} />
          : <RemoteError message={t('area.error')} onRetry={retry} />}
      </Page>
    );
  }

  const area = state.data;
  const subtitle = [area.typology, ...area.neighborhoods.slice(0, 2)].filter(Boolean).join(' · ');
  return (
    <Page title={area.name} subtitle={subtitle} back>
      <ul className="flex flex-wrap gap-2">
        {area.areaM2 !== null && (
          <li className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-caption font-medium text-accent">
            <Trees size={14} aria-hidden="true" />
            {formatArea(area.areaM2, lang)}
          </li>
        )}
        {area.plants.total > 0 && (
          <li className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-caption font-medium text-ink-2">
            <Leaf size={14} aria-hidden="true" />
            {t('area.plants', { count: formatCount(area.plants.total, lang) })}
          </li>
        )}
        {area.plants.species > 0 && (
          <li className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-caption font-medium text-ink-2">
            <Sprout size={14} aria-hidden="true" />
            {t('area.species', { count: formatCount(area.plants.species, lang) })}
          </li>
        )}
      </ul>

      <Button icon={MapPin} block to={`/mapa?zona=${area.groupSlug}`}>
        {t('area.viewOnMap')}
      </Button>

      {area.articles.length > 0 && (
        <section aria-labelledby="area-articles">
          <h2 id="area-articles" className="font-display mt-3 text-heading text-ink">{t('area.articles')}</h2>
          <List className="mt-2">
            {area.articles.map((article) => (
              <ListItem
                key={article.slug}
                icon={BookOpen}
                title={article.title}
                subtitle={article.summary}
                to={`/descubre/${article.slug}`}
              />
            ))}
          </List>
        </section>
      )}

      <section aria-labelledby="area-flora">
        <h2 id="area-flora" className="font-display mt-3 text-heading text-ink">{t('area.flora')}</h2>
        {area.topSpecies.length === 0 ? (
          <p role="note" className="mt-2 text-body text-muted">{t('area.floraEmpty')}</p>
        ) : (
          <List className="mt-2">
            {area.topSpecies.map((species) => (
              <ListItem
                key={species.speciesId}
                icon={Leaf}
                title={species.commonName ?? species.scientificName}
                subtitle={species.commonName ? species.scientificName : undefined}
                to={`/mapa?verEspecie=${species.speciesId}`}
                trailing={(
                  <span className="text-caption tabular-nums text-muted">
                    {t('area.specimens', { count: formatCount(species.plants, lang) })}
                  </span>
                )}
              />
            ))}
          </List>
        )}
      </section>

      {area.pois.length > 0 && (
        <section aria-labelledby="area-pois">
          <h2 id="area-pois" className="font-display mt-3 text-heading text-ink">{t('area.pois')}</h2>
          <List className="mt-2">
            {area.pois.map((poi) => (
              <ListItem key={poi.id} icon={Landmark} title={poi.name} />
            ))}
          </List>
        </section>
      )}

      {area.dataSource && (
        <section aria-labelledby="area-source" className="mt-3 rounded-card bg-surface-2 p-4">
          <h2 id="area-source" className="text-caption font-semibold uppercase tracking-wider text-muted">
            {t('area.source')}
          </h2>
          <p className="mt-1 text-small text-ink-2">
            <a href={area.dataSource.url} target="_blank" rel="noreferrer" className="font-semibold text-accent underline">
              {area.dataSource.provider} · {area.dataSource.name}
            </a>
          </p>
          <p className="mt-1 text-small text-muted">{area.dataSource.attribution}</p>
          <p className="mt-1 text-small text-muted">
            <a href={area.dataSource.licenseUrl} target="_blank" rel="noreferrer" className="underline">
              {t('area.license', { license: area.dataSource.license })}
            </a>
          </p>
        </section>
      )}
    </Page>
  );
}
