import { useEffect, useState } from 'react';
import { Check, Info, Leaf } from 'lucide-react';
import { Page } from '../../components/Page';
import { cn } from '../../utils/cn';
import { useApp } from '../../context/useApp';
import {
  DEFAULT_DIRECTION,
  DIRECTIONS,
  LAB_FONTS_HREF,
  type TypeDirection,
} from './directions';

/**
 * Carga las fuentes del laboratorio solo mientras se visita `/tipografia`.
 * En producción se autoalojarían en woff2; aquí basta para comparar.
 */
function useLabFonts() {
  useEffect(() => {
    const preconnect = document.createElement('link');
    preconnect.rel = 'preconnect';
    preconnect.href = 'https://fonts.googleapis.com';
    preconnect.dataset.typeLab = 'true';

    const preconnectStatic = document.createElement('link');
    preconnectStatic.rel = 'preconnect';
    preconnectStatic.href = 'https://fonts.gstatic.com';
    preconnectStatic.crossOrigin = 'anonymous';
    preconnectStatic.dataset.typeLab = 'true';

    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = LAB_FONTS_HREF;
    stylesheet.dataset.typeLab = 'true';

    document.head.append(preconnect, preconnectStatic, stylesheet);

    return () => {
      preconnect.remove();
      preconnectStatic.remove();
      stylesheet.remove();
    };
  }, []);
}

const NAV_ITEMS = ['nav.home', 'nav.map', 'nav.scan', 'nav.routes', 'nav.search'] as const;

function uiStyle(direction: TypeDirection, size?: number, weight = 600) {
  return {
    ...direction.styles.ui,
    ...(size === undefined ? {} : { fontSize: size }),
    fontWeight: weight,
  };
}

function DirectionPreview({ direction }: { direction: TypeDirection }) {
  const { t } = useApp();
  return (
    <div
      className="mt-4 overflow-hidden rounded-panel border border-line bg-app"
      style={{ fontFamily: direction.stack.body, fontSynthesis: 'none' }}
    >
      <div className="relative flex h-28 items-center justify-center bg-accent-soft text-accent">
        <Leaf size={34} strokeWidth={1.5} aria-hidden="true" />
        <span
          className="absolute left-3 top-3 rounded-full bg-surface/90 px-2.5 py-1 text-accent shadow-raised"
          style={direction.styles.caption}
        >
          {t('home.ficha')}
        </span>
      </div>

      <div className="p-4">
        <p style={direction.styles.caption} className="text-muted">
          {t('result.best')}
        </p>
        <h3 style={direction.styles.title} className="mt-1 text-balance text-ink">
          Jacaranda mimosifolia
        </h3>
        <p style={direction.styles.small} className="mt-1 text-muted">
          Jacaranda · Bignoniaceae
        </p>

        <p style={direction.styles.body} className="mt-3 text-muted text-pretty">
          {t('lab.sampleLong')}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <span
            style={uiStyle(direction, direction.scale.caption)}
            className="inline-flex min-h-7 items-center rounded-full bg-accent px-2.5 text-on-accent tabular-nums"
          >
            {t('ficha.confidence', { score: 91 })}
          </span>
          <span
            style={uiStyle(direction, direction.scale.caption)}
            className="inline-flex min-h-7 items-center rounded-full bg-accent-soft px-2.5 text-accent tabular-nums"
          >
            {t('ficha.specimens', { count: 3 })}
          </span>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            style={uiStyle(direction)}
            className="min-h-11 flex-1 rounded-control bg-accent px-3 text-on-accent shadow-raised transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            {t('result.viewCard')}
          </button>
          <button
            type="button"
            style={uiStyle(direction)}
            className="min-h-11 flex-1 rounded-control bg-surface px-3 text-ink shadow-raised transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {t('ficha.viewOnMap')}
          </button>
        </div>

        <input
          type="text"
          placeholder={t('search.placeholder')}
          aria-label={t('lab.searchAria')}
          style={{ fontFamily: direction.stack.ui, fontSize: 16 }}
          className="mt-4 min-h-11 w-full rounded-control border border-line bg-surface px-3 text-ink outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-accent"
        />

        <p style={direction.styles.small} className="mt-3 text-muted">
          {t('lab.sourceExample')}
        </p>
      </div>

      <div
        className="grid grid-cols-5 gap-1 border-t border-line bg-surface px-2 py-2 text-center"
        style={{ fontFamily: direction.stack.ui }}
      >
        {NAV_ITEMS.map((item, index) => (
          <span
            key={item}
            style={{ fontSize: direction.scale.caption, fontWeight: index === 1 ? 700 : 500 }}
            className={index === 1 ? 'text-accent' : 'text-muted'}
          >
            {t(item)}
          </span>
        ))}
      </div>
    </div>
  );
}

function ReadingSample({ direction }: { direction: TypeDirection }) {
  const { t } = useApp();
  return (
    <div
      className="mt-4 rounded-card bg-surface p-4 shadow-raised"
      style={{ fontFamily: direction.stack.body, fontSynthesis: 'none' }}
    >
      <h2 style={direction.styles.heading} className="text-balance text-ink">
        {t('lab.readingTitle')}
      </h2>
      <p style={direction.styles.body} className="mt-2 text-muted text-pretty">
        {t('lab.readingBody')}
      </p>
      <p style={direction.styles.body} className="mt-2 text-muted text-pretty">
        {t('lab.readingScientificBefore')} <em>Jacaranda mimosifolia</em> {t('lab.readingScientificAfter')}
      </p>
      <p style={direction.styles.small} className="mt-3 text-muted">
        {t('lab.readingSmall')}
      </p>
    </div>
  );
}

export function TypographyLab() {
  const { t } = useApp();
  useLabFonts();
  const [selectedId, setSelectedId] = useState(DEFAULT_DIRECTION);
  const selected = DIRECTIONS.find((direction) => direction.id === selectedId) ?? DIRECTIONS[0];

  return (
    <Page title={t('lab.typeTitle')} subtitle={t('lab.typeSubtitle')} back settings={false}>
      <p className="text-body text-muted text-pretty">
        {t('lab.typeIntro')}
      </p>

      <div
        role="group"
        aria-label={t('lab.typeDirections')}
        className="flex flex-wrap gap-2"
      >
        {DIRECTIONS.map((direction) => {
          const active = direction.id === selected.id;
          return (
            <button
              key={direction.id}
              type="button"
              aria-pressed={active}
              onClick={() => setSelectedId(direction.id)}
              className={cn(
                'min-h-11 shrink-0 rounded-full px-3.5 text-small font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
                active ? 'bg-accent text-on-accent shadow-raised' : 'bg-surface text-ink shadow-raised',
              )}
            >
              {t(direction.name)}
            </button>
          );
        })}
      </div>

      <section
        id="type-lab-preview"
        aria-label={t('lab.typePreview')}
        className="mt-1 rounded-panel bg-surface p-4 shadow-raised"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-display text-heading text-ink">{t(selected.name)}</h2>
            <p className="mt-0.5 text-small text-muted">{t(selected.tagline)}</p>
          </div>
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-caption uppercase tracking-wider text-accent">
            {selected.id === 'todos'
              ? t('lab.chosen')
              : selected.id === 'actual'
                ? t('lab.previous')
                : t('lab.alternative')}
          </span>
        </div>

        <p className="mt-2 text-small text-muted text-pretty">{t(selected.summary)}</p>

        <DirectionPreview direction={selected} />
        <ReadingSample direction={selected} />

        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-small">
          <div>
            <p className="text-caption uppercase tracking-wider text-muted">{t('lab.headings')}</p>
            <p className="text-ink">{selected.displayFamily}</p>
          </div>
          <div>
            <p className="text-caption uppercase tracking-wider text-muted">{t('lab.body')}</p>
            <p className="text-ink">{selected.bodyFamily}</p>
          </div>
          <div>
            <p className="text-caption uppercase tracking-wider text-muted">{t('lab.interface')}</p>
            <p className="text-ink">{selected.uiFamily}</p>
          </div>
          <div>
            <p className="text-caption uppercase tracking-wider text-muted">{t('lab.scale')}</p>
            <p className="text-ink tabular-nums">
              {selected.scale.title} / {selected.scale.heading} / {selected.scale.body} /{' '}
              {selected.scale.small} / {selected.scale.caption}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <div>
            <p className="text-caption uppercase tracking-wider text-muted">{t('lab.strengths')}</p>
            <ul className="mt-1.5 space-y-1.5">
              {selected.notes.map((note) => (
                <li key={note} className="flex gap-2 text-small text-ink">
                  <Check size={15} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                  <span>{t(note)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-caption uppercase tracking-wider text-muted">{t('lab.watchOut')}</p>
            <ul className="mt-1.5 space-y-1.5">
              {selected.watchOut.map((note) => (
                <li key={note} className="flex gap-2 text-small text-muted">
                  <Info size={15} className="mt-0.5 shrink-0 text-warm-strong" aria-hidden="true" />
                  <span>{t(note)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <details className="rounded-panel bg-surface p-4 shadow-raised">
        <summary className="cursor-pointer text-body font-semibold text-ink">
          {t('lab.compareDirections')}
        </summary>
        <div className="mt-4 space-y-3">
          {DIRECTIONS.map((direction) => (
            <div
              key={direction.id}
              className="rounded-card border border-line p-3"
              style={{ fontFamily: direction.stack.body, fontSynthesis: 'none' }}
            >
              <div className="flex items-center justify-between gap-2">
                <p
                  className="text-small font-semibold text-ink"
                  style={{ fontFamily: direction.stack.ui }}
                >
                  {t(direction.name)}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(direction.id);
                    document.getElementById('type-lab-preview')?.scrollIntoView({ block: 'start' });
                  }}
                  className="min-h-9 shrink-0 rounded-full px-2 text-caption font-semibold text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {t('lab.enlarge')}
                </button>
              </div>
              <p
                style={{ ...direction.styles.title, fontSize: Math.min(direction.scale.title, 22) }}
                className="mt-2 text-balance text-ink"
              >
                Jacaranda mimosifolia
              </p>
              <p
                style={{ ...direction.styles.body, fontSize: Math.min(direction.scale.body, 15) }}
                className="mt-1 text-muted text-pretty"
              >
                {t('lab.sampleCaption')}
              </p>
              <p className="mt-1 text-caption text-muted" style={{ fontFamily: direction.stack.ui }}>
                {direction.displayFamily} · {direction.bodyFamily} · {direction.uiFamily}
              </p>
            </div>
          ))}
        </div>
      </details>

      <p className="text-caption text-muted text-pretty">
        {t('lab.typeFooter')} <code className="mx-1">src/index.css</code>.
      </p>
    </Page>
  );
}

export default TypographyLab;
