import { ExternalLink, Trees } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { Page } from '../../components/Page';
import { RemoteError, RemoteLoading } from '../../components/RemoteStatus';
import { Badge } from '../../components/ui/Badge';
import { ListItem } from '../../components/ui/ListItem';
import { useApp } from '../../context/useApp';
import { useRemote } from '../../hooks/useRemote';
import { fetchArticle, isFallbackLanguage } from '../../services/editorial';
import type { Article } from '../../types/greenArea';

/**
 * Artículo editorial (NM-08): texto, enlace a la zona verde de la que habla y
 * fuentes visibles (RNF6). Volver retrocede en el historial, así que se
 * regresa a la ficha de planta, de zona o de POI desde la que se abrió.
 */
export function ArticlePage() {
  const { t, lang } = useApp();
  const { slug = '' } = useParams();
  const { state, retry } = useRemote<Article>(`${lang}|${slug}`, (signal) => fetchArticle(slug, lang, signal));

  if (state.status !== 'ready') {
    return (
      <Page title={t('discover.title')} back>
        {state.status === 'loading'
          ? <RemoteLoading message={t('article.loading')} />
          : <RemoteError message={t('article.error')} onRetry={retry} />}
      </Page>
    );
  }

  const article = state.data;
  return (
    <Page title={article.title} subtitle={article.summary} back>
      <Badge>{t(`discover.topic.${article.topic}`)}</Badge>

      {isFallbackLanguage(article.language, lang) && (
        <p role="note" className="rounded-card bg-surface-2 px-4 py-3 text-small text-muted">
          {t('article.fallbackLanguage')}
        </p>
      )}

      <article lang={article.language} className="flex flex-col gap-3">
        {article.body.split(/\n{2,}/).map((paragraph) => (
          <p key={paragraph.slice(0, 40)} className="font-body text-body text-ink-2 text-pretty">
            {paragraph}
          </p>
        ))}
      </article>

      {article.greenAreaGroup && (
        <ListItem
          icon={Trees}
          title={t('article.viewArea')}
          subtitle={t('article.viewAreaDesc')}
          to={`/zona/${article.greenAreaGroup}`}
        />
      )}

      <h2 className="font-display mt-3 text-heading text-ink">{t('article.sources')}</h2>
      <ul className="flex flex-col gap-2">
        {article.sources.map((source) => (
          <li key={source.url}>
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-3 rounded-card bg-surface p-3 shadow-raised transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <ExternalLink size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-body font-semibold text-ink">{source.name}</span>
                <span className="text-small text-muted">{source.description}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </Page>
  );
}
