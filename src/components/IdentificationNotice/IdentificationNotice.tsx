import { useApp } from '../../context/useApp';
import type { Language } from '../../types/language';
import type { IdentificationFailure } from '../../types/identify';
import es from './locales/es.json';
import va from './locales/va.json';
import en from './locales/en.json';

const translations = { es, va, en } satisfies Record<Language, typeof es>;

export interface IdentificationNoticeProps {
  /** Causa de la identificación fallida; nunca se interpreta un mensaje traducido. */
  failure: IdentificationFailure | null;
}

/** UT 932: explica el fallo conservando la foto y el control Reintentar de la cámara. */
export function IdentificationNotice({ failure }: IdentificationNoticeProps) {
  const { lang } = useApp();
  const text = translations[lang];
  let title = text.genericTitle;
  let body = text.genericBody;

  if (failure?.code === 'unreachable') {
    const offline = navigator.onLine === false;
    title = offline ? text.offlineTitle : text.unreachableTitle;
    body = offline ? text.offlineBody : text.unreachableBody;
  } else if (failure?.status === 429) {
    title = text.limitTitle;
    body = text.limitBody;
  } else if (failure?.status === 502 || failure?.status === 504) {
    title = text.serviceTitle;
    body = text.serviceBody;
  } else if (failure?.code === 'invalid-image') {
    body = text.invalidImageBody;
  } else if (failure?.status !== undefined) {
    body = text.httpError.replace('{status}', String(failure.status));
  }

  return (
    <section role="status" aria-live="polite" className="mb-3 rounded-card bg-surface p-4 text-ink shadow-raised">
      <h2 className="font-display text-heading text-balance">{title}</h2>
      <p className="mt-2 text-small text-muted text-pretty">{body}</p>
    </section>
  );
}
