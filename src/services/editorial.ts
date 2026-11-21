import { apiGet } from './api';
import { API_LANGUAGE } from './greenAreas';
import type { Language } from '../types/language';
import type { Article, ArticleSummary, EditorialTopic } from '../types/greenArea';

// Contenido editorial de flora y zonas verdes (NM-08): `/editorial` del backend.

interface ArticlesResponse {
  returned: number;
  articles: ArticleSummary[];
}

export interface ArticleFilter {
  topic?: EditorialTopic | null;
  /** Identificador de la zona verde (`groupSlug`) a la que se refiere. */
  group?: string | null;
}

export async function fetchArticles(lang: Language, filter: ArticleFilter = {}, signal?: AbortSignal): Promise<ArticleSummary[]> {
  const params = new URLSearchParams({ lang: API_LANGUAGE[lang] });
  if (filter.topic) params.set('topic', filter.topic);
  if (filter.group) params.set('group', filter.group);
  return (await apiGet<ArticlesResponse>(`/editorial?${params.toString()}`, signal)).articles;
}

export function fetchArticle(slug: string, lang: Language, signal?: AbortSignal): Promise<Article> {
  return apiGet<Article>(`/editorial/${encodeURIComponent(slug)}?lang=${API_LANGUAGE[lang]}`, signal);
}

/** true si el texto no está en el idioma de la app (se avisa al lector). */
export function isFallbackLanguage(articleLanguage: string, lang: Language): boolean {
  return articleLanguage !== API_LANGUAGE[lang];
}
