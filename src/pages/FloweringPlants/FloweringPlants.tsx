import { useEffect, useState } from 'react';
import { ArrowLeft, Flower2, Sprout } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/useApp';
import { getFloweringSpecies } from '../../services/ficha';
import type { FichaListItem } from '../../services/ficha';
import { commonNameFor } from '../../services/ficha';
import { repairTextEncoding } from '../../i18n/format';

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; items: FichaListItem[] };

export interface FloweringPlantsProps {
  onSelectSpecies: (item: FichaListItem) => void;
}

export function FloweringPlants({ onSelectSpecies }: FloweringPlantsProps) {
  const { lang, t } = useApp();
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const month = new Date().getMonth() + 1;

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    getFloweringSpecies(month, lang)
      .then((items) => { if (!cancelled) setState({ status: 'ready', items }); })
      .catch(() => { if (!cancelled) setState({ status: 'error' }); });
    return () => { cancelled = true; };
  }, [lang, month]);

  const monthName = new Intl.DateTimeFormat(lang === 'va' ? 'ca' : lang, { month: 'long' })
    .format(new Date(2020, month - 1, 1));

  return (
    <main className="min-h-full overflow-y-auto bg-app px-4 pb-6 pt-4">
      <header className="mb-5 flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} aria-label={t('common.back')} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink shadow-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <div>
          <h1 className="font-display text-title text-ink">{t('home.floweringTitle')}</h1>
          <p className="text-small capitalize text-muted">{monthName}</p>
        </div>
      </header>

      {state.status === 'loading' && <p role="status" className="py-10 text-center text-body text-muted">{t('home.floweringLoading')}</p>}
      {state.status === 'error' && <p role="alert" className="py-10 text-center text-body text-danger">{t('home.floweringError')}</p>}
      {state.status === 'ready' && state.items.length === 0 && <p className="py-10 text-center text-body text-muted">{t('home.floweringEmpty')}</p>}
      {state.status === 'ready' && state.items.length > 0 && (
        <ul className="grid grid-cols-2 gap-3">
          {state.items.map((item) => {
            const commonName = repairTextEncoding(commonNameFor(item.names, lang) ?? item.scientificName);
            return (
              <li key={item.id}>
                <button type="button" onClick={() => onSelectSpecies(item)} className="flex h-full w-full flex-col overflow-hidden rounded-card border border-line bg-surface text-left shadow-raised transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  <div className="aspect-[4/3] w-full bg-accent-soft">
                    {item.image?.url ? (
                      <img src={item.image.url} alt="" className="h-full w-full object-cover outline outline-1 -outline-offset-1 outline-black/10" />
                    ) : (
                      <div className="grid h-full place-items-center text-accent"><Sprout size={40} aria-hidden="true" /></div>
                    )}
                  </div>
                  <span className="flex min-w-0 flex-1 flex-col p-3">
                    <span className="flex min-w-0 items-start gap-1.5 text-body font-semibold text-ink">
                      <Flower2 size={15} className="mt-1 shrink-0 text-bloom-strong" aria-hidden="true" />
                      <span className="min-w-0 whitespace-normal break-words">{commonName}</span>
                    </span>
                    <span className="mt-1 whitespace-normal break-words text-small italic text-muted">{repairTextEncoding(item.scientificName)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
