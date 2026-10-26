import { ArrowLeft, ChevronRight } from 'lucide-react';
import { LANGUAGE_NAMES, type Language } from '../../types/language';

export interface SettingsPageProps {
  language: Language;
  onBack: () => void;
  onOpenLanguage: () => void;
}

export function SettingsPage({ language, onBack, onOpenLanguage }: SettingsPageProps) {
  return (
    <section className="mx-auto w-full max-w-md px-4 pb-28 pt-5">
      <header className="mb-6 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-neutral-700 transition-colors hover:bg-neutral-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
        >
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Ajustes</h1>
      </header>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={onOpenLanguage}
          aria-label={`Idioma: ${LANGUAGE_NAMES[language]}`}
          className="flex min-h-16 w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-700"
        >
          <span className="text-base font-medium text-neutral-900">Idioma</span>
          <span className="flex items-center gap-1 text-sm text-neutral-500">
            {LANGUAGE_NAMES[language]}
            <ChevronRight size={18} aria-hidden="true" />
          </span>
        </button>
      </div>
    </section>
  );
}
