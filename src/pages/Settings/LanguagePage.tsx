import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { LANGUAGES, LANGUAGE_NAMES, type Language } from '../../types/language';

export interface LanguagePageProps {
  language: Language;
  onBack: () => void;
  onSave: (language: Language) => void;
}

export function LanguagePage({ language, onBack, onSave }: LanguagePageProps) {
  const [draft, setDraft] = useState<Language>(language);

  const handleSave = () => {
    onSave(draft);
    onBack();
  };

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
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Idioma</h1>
      </header>

      <p className="mb-4 text-sm text-neutral-600">Elige el idioma de la aplicación.</p>

      <fieldset className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <legend className="sr-only">Idioma</legend>
        {LANGUAGES.map((option, index) => (
          <label
            key={option}
            className={`flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-neutral-50 ${
              index > 0 ? 'border-t border-neutral-200' : ''
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
            <span className="text-base text-neutral-900">{LANGUAGE_NAMES[option]}</span>
          </label>
        ))}
      </fieldset>

      <button
        type="button"
        onClick={handleSave}
        className="mt-6 min-h-12 w-full rounded-xl bg-emerald-700 px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
      >
        Guardar
      </button>
    </section>
  );
}
