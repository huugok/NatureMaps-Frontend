import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { LANGUAGES, LANGUAGE_NAMES, type Language } from '../../types/language';

export interface LanguagePageProps {
  language: Language;
  onBack: () => void;
  onSave: (language: Language) => void;
}

export function LanguagePage({ language, onBack, onSave }: LanguagePageProps) {
  const { t } = useApp();
  const [draft, setDraft] = useState<Language>(language);

  const handleSave = () => {
    onSave(draft);
    onBack();
  };

  return (
    <section className="w-full px-4 pt-[max(20px,env(safe-area-inset-top))] pb-[calc(24px+env(safe-area-inset-bottom,0px))]">
      <header className="mb-6 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label={t('common.back')}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-neutral-700 transition-colors hover:bg-neutral-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
        >
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <h1 className="text-title text-balance text-ink">{t('language.title')}</h1>
      </header>

      <p className="mb-4 text-small text-muted text-pretty">{t('language.description')}</p>

      <fieldset className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <legend className="sr-only">{t('language.title')}</legend>
        {LANGUAGES.map((option, index) => (
          <label
            key={option}
            className={`flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-neutral-50 ${
              index > 0 ? 'border-t border-line' : ''
            }`}
          >
            <input
              type="radio"
              name="language"
              value={option}
              checked={draft === option}
              onChange={() => setDraft(option)}
              className="h-5 w-5 accent-emerald-700"
            />
            <span className="text-body text-ink">{LANGUAGE_NAMES[option]}</span>
          </label>
        ))}
      </fieldset>

      <button
        type="button"
        onClick={handleSave}
        className="mt-6 min-h-12 w-full rounded-card bg-accent px-4 py-3 text-body font-semibold text-on-accent shadow-sm transition-colors hover:bg-accent-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        {t('common.save')}
      </button>
    </section>
  );
}
