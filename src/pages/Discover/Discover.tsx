import { BookOpen } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Page } from '../../components/Page';
import { RemoteError, RemoteLoading } from '../../components/RemoteStatus';
import { Chip } from '../../components/ui/Chip';
import { EmptyState } from '../../components/ui/EmptyState';
import { List } from '../../components/ui/List';
import { ListItem } from '../../components/ui/ListItem';
import { useApp } from '../../context/useApp';
import { useRemote } from '../../hooks/useRemote';
import { fetchArticles } from '../../services/editorial';
import { EDITORIAL_TOPICS, isEditorialTopic } from '../../types/greenArea';
import type { ArticleSummary, EditorialTopic } from '../../types/greenArea';

const GROUP_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Contenido editorial sobre la flora y las zonas verdes de València (NM-08),
 * en secciones temáticas. `?tema=` abre una sección y `?zona=` deja solo los
 * artículos de una zona verde: así enlazan las fichas de planta, de zona y de
 * POI directamente con su contenido.
 */
export function Discover() {
  const { t, lang } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const topicParam = searchParams.get('tema');
  const topic: EditorialTopic | null = isEditorialTopic(topicParam) ? topicParam : null;
  const groupParam = searchParams.get('zona');
  const group = groupParam !== null && GROUP_SLUG.test(groupParam) ? groupParam : null;

  const { state, retry } = useRemote<ArticleSummary[]>(
    `${lang}|${group ?? ''}`,
    (signal) => fetchArticles(lang, { group }, signal),
  );

  const selectTopic = (next: EditorialTopic | null) => {
    const params = new URLSearchParams(searchParams);
    if (next) params.set('tema', next);
    else params.delete('tema');
    setSearchParams(params, { replace: true });
  };

  const showAll = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('zona');
    setSearchParams(params, { replace: true });
  };

  const articles = state.status === 'ready' ? state.data : [];
  const sections = EDITORIAL_TOPICS
    .filter((item) => topic === null || item === topic)
    .map((item) => ({ topic: item, articles: articles.filter((article) => article.topic === item) }))
    .filter((section) => section.articles.length > 0);

  return (
    <Page title={t('discover.title')} subtitle={t('discover.subtitle')} back>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label={t('discover.title')}>
        <Chip active={topic === null} onClick={() => selectTopic(null)}>{t('discover.all')}</Chip>
        {EDITORIAL_TOPICS.map((item) => (
          <Chip key={item} active={topic === item} onClick={() => selectTopic(item)}>
            {t(`discover.topic.${item}`)}
          </Chip>
        ))}
      </div>

      {group !== null && (
        <p className="flex items-center justify-between gap-3 rounded-card bg-accent-soft px-4 py-2 text-small text-ink-2">
          {t('discover.filteredByArea')}
          <button type="button" onClick={showAll} className="min-h-11 shrink-0 font-semibold text-accent underline">
            {t('discover.showAll')}
          </button>
        </p>
      )}

      {state.status === 'loading' && <RemoteLoading message={t('discover.loading')} />}
      {state.status === 'error' && <RemoteError message={t('discover.error')} onRetry={retry} />}
      {state.status === 'ready' && sections.length === 0 && (
        <EmptyState icon={BookOpen} title={t('discover.empty')} description={t('discover.emptyDesc')} />
      )}
      {sections.map((section) => (
        <section key={section.topic} aria-labelledby={`discover-${section.topic}`}>
          <h2 id={`discover-${section.topic}`} className="mt-3 text-caption font-semibold uppercase tracking-wider text-muted">
            {t(`discover.topic.${section.topic}`)}
          </h2>
          <List className="mt-2">
            {section.articles.map((article) => (
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
      ))}
    </Page>
  );
}
