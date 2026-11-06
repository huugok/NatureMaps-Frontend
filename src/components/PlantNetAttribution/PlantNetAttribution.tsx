import { useApp } from '../../context/useApp';
import type { Language } from '../../types/language';
import es from './locales/es.json';
import va from './locales/va.json';
import en from './locales/en.json';

// Recursos propios: UT 933 funciona tanto antes como después de integrar UT 921.
const translations = { es, va, en } satisfies Record<Language, typeof es>;

/** Atribución del servicio de identificación en el idioma actual de la interfaz. */
export function PlantNetAttribution() {
  const { lang } = useApp();
  const text = translations[lang];

  return (
    <div>
      <img
        src="/plantnet-logo.svg"
        alt={text.logoAlt}
        width={859}
        height={236}
        className="h-auto w-44 max-w-full"
      />
      <p className="mt-3 text-pretty">
        {text.attribution}{' '}
        <a
          href="https://my.plantnet.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 max-w-full items-center break-all rounded-control text-accent underline underline-offset-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          https://my.plantnet.org/
        </a>
      </p>
    </div>
  );
}
