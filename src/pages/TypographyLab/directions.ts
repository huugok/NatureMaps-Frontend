import type { CSSProperties } from 'react';

export interface TypeScale {
  title: number;
  heading: number;
  body: number;
  small: number;
  caption: number;
}

export interface TypeDirection {
  id: string;
  name: string;
  tagline: string;
  summary: string;
  displayFamily: string;
  bodyFamily: string;
  uiFamily: string;
  stack: {
    display: string;
    body: string;
    ui: string;
  };
  scale: TypeScale;
  styles: {
    title: CSSProperties;
    heading: CSSProperties;
    body: CSSProperties;
    small: CSSProperties;
    caption: CSSProperties;
    ui: CSSProperties;
  };
  notes: string[];
  watchOut: string[];
}

interface DirectionInput {
  id: string;
  name: string;
  tagline: string;
  summary: string;
  display: { name: string; stack: string; weight: number };
  body: { name: string; stack: string };
  ui: { name: string; stack: string; weight?: number };
  scale: TypeScale;
  leading: { title: number; heading: number; body: number };
  tracking: { title: string; heading: string; caption?: string };
  notes: string[];
  watchOut: string[];
}

function direction(input: DirectionInput): TypeDirection {
  return {
    ...input,
    displayFamily: input.display.name,
    bodyFamily: input.body.name,
    uiFamily: input.ui.name,
    stack: {
      display: input.display.stack,
      body: input.body.stack,
      ui: input.ui.stack,
    },
    styles: {
      title: {
        fontFamily: input.display.stack,
        fontSize: input.scale.title,
        lineHeight: input.leading.title,
        fontWeight: input.display.weight,
        letterSpacing: input.tracking.title,
      },
      heading: {
        fontFamily: input.display.stack,
        fontSize: input.scale.heading,
        lineHeight: input.leading.heading,
        fontWeight: input.display.weight,
        letterSpacing: input.tracking.heading,
      },
      body: {
        fontFamily: input.body.stack,
        fontSize: input.scale.body,
        lineHeight: input.leading.body,
      },
      small: {
        fontFamily: input.body.stack,
        fontSize: input.scale.small,
        lineHeight: 1.45,
      },
      caption: {
        fontFamily: input.ui.stack,
        fontSize: input.scale.caption,
        lineHeight: 1.2,
        fontWeight: 700,
        letterSpacing: input.tracking.caption ?? '0.06em',
        textTransform: 'uppercase',
      },
      ui: {
        fontFamily: input.ui.stack,
        fontSize: input.scale.body,
        lineHeight: 1.35,
        fontWeight: input.ui.weight ?? 600,
      },
    },
  };
}

const INTER = "'Inter', system-ui, -apple-system, sans-serif";
const FRAUNCES = "'Fraunces', 'Iowan Old Style', 'Palatino Linotype', Georgia, serif";
const ALEGREYA = "'Alegreya', 'Iowan Old Style', 'Palatino Linotype', Georgia, serif";
const ALEGREYA_SANS = "'Alegreya Sans', 'Inter', system-ui, sans-serif";
const BRICOLAGE = "'Bricolage Grotesque', 'Inter', system-ui, sans-serif";
const NUNITO = "'Nunito Sans', 'Inter', system-ui, sans-serif";
const LITERATA = "'Literata Variable', 'Literata', 'Iowan Old Style', 'Palatino Linotype', Georgia, serif";
const ATKINSON = "'Atkinson Hyperlegible', 'Inter', system-ui, sans-serif";

/**
 * Direcciones tipográficas del laboratorio.
 *
 * No son tokens de producto todavía: son propuestas para comparar. La escala
 * parte de la actual y sube el cuerpo a 16 px y la leyenda a 12 px, los mínimos
 * cómodos para leer en un móvil.
 */
export const DIRECTIONS: TypeDirection[] = [
  direction({
    id: 'actual',
    name: 'Anterior (Inter)',
    tagline: 'La línea base que tenía la app antes de la decisión',
    summary:
      'La app declara Inter en el token, pero no carga la fuente: en la mayoría de equipos se ve system-ui. Aquí se carga para comparar de verdad.',
    display: { name: 'Inter', stack: INTER, weight: 700 },
    body: { name: 'Inter', stack: INTER },
    ui: { name: 'Inter', stack: INTER },
    scale: { title: 24, heading: 18, body: 15, small: 13, caption: 11.5 },
    leading: { title: 1.15, heading: 1.3, body: 1.5 },
    tracking: { title: '-0.02em', heading: '-0.01em' },
    notes: [
      'Es la escala que ya está en `src/index.css`; sirve de control.',
      'Si se elige, basta con cargar Inter de verdad y subir cuerpo y leyenda.',
    ],
    watchOut: [
      'Cuerpo a 15 px y leyenda a 11.5 px: por debajo de los mínimos cómodos para un público amplio.',
      'Los títulos no tienen una voz propia; toda la personalidad recae en el verde.',
    ],
  }),
  direction({
    id: 'guia',
    name: 'Guía de campo',
    tagline: 'Serif orgánica para titulares, Inter para todo lo demás',
    summary:
      'Fraunces aporta el aire de guía botánica y cuaderno de campo; Inter mantiene la familiaridad de la interfaz. Es el cambio con más carácter y menos riesgo.',
    display: { name: 'Fraunces', stack: FRAUNCES, weight: 600 },
    body: { name: 'Inter', stack: INTER },
    ui: { name: 'Inter', stack: INTER },
    scale: { title: 26, heading: 18, body: 16, small: 13.5, caption: 12 },
    leading: { title: 1.1, heading: 1.3, body: 1.55 },
    tracking: { title: '-0.01em', heading: '-0.01em' },
    notes: [
      'Fraunces tiene ejes ópticos y un punto “wonk” que la hace cálida sin ser decorativa.',
      'El cuerpo sigue en Inter: la UI no cambia y la lectura gana 1 px.',
      'Los nombres científicos pueden ir en cursiva dentro del texto; el titular se queda romano.',
    ],
    watchOut: [
      'No usar Fraunces por debajo de 20 px: a tamaños pequeños pierde finura.',
      'El tracking negativo en una serif debe ser mínimo; nunca -0.02em.',
    ],
  }),
  direction({
    id: 'cuaderno',
    name: 'Cuaderno botánico',
    tagline: 'Alegreya para leer, Alegreya Sans para tocar',
    summary:
      'Una superfamilia humanista de raíz caligráfica. La prosa se vuelve relato de herbario y los controles siguen claros. La opción más editorial y la más “natural” en el sentido clásico.',
    display: { name: 'Alegreya', stack: ALEGREYA, weight: 600 },
    body: { name: 'Alegreya', stack: ALEGREYA },
    ui: { name: 'Alegreya Sans', stack: ALEGREYA_SANS },
    scale: { title: 27, heading: 19, body: 16.5, small: 14, caption: 12 },
    leading: { title: 1.12, heading: 1.3, body: 1.6 },
    tracking: { title: '0', heading: '0' },
    notes: [
      'Alegreya y Alegreya Sans comparten esqueleto: cohesión sin repetir la misma voz.',
      'La serif pide 16.5 px y 1.6 de interlineado para párrafos largos; la sans evita la UI fina.',
      'Encaja con rutas culturales, fichas y textos de herbario.',
    ],
    watchOut: [
      'Más clásica y menos “app”: probar formularios, botones y la barra inferior.',
      'No llevar Alegreya a etiquetas pequeñas; para eso está la Sans.',
    ],
  }),
  direction({
    id: 'sendero',
    name: 'Sendero cercano',
    tagline: 'Grotesca orgánica y sans redondeada',
    summary:
      'Bricolage Grotesque tiene terminales suaves y un punto humanista; Nunito Sans redondea la lectura. Habla de centro de naturaleza, familias y grupos escolares.',
    display: { name: 'Bricolage Grotesque', stack: BRICOLAGE, weight: 600 },
    body: { name: 'Nunito Sans', stack: NUNITO },
    ui: { name: 'Nunito Sans', stack: NUNITO },
    scale: { title: 26, heading: 18, body: 16, small: 14, caption: 12 },
    leading: { title: 1.1, heading: 1.3, body: 1.55 },
    tracking: { title: '-0.01em', heading: '-0.005em' },
    notes: [
      'La dirección más cercana y menos académica: buena para público familiar y escolar.',
      'Nunito Sans mantiene la legibilidad en tamaños pequeños y controles.',
    ],
    watchOut: [
      'Puede leerse más “marca cívica” que botánica; el verde y las fotos tendrán que sostener la naturaleza.',
      'No abusar de los pesos extremos de Bricolage: 500–700 es suficiente.',
    ],
  }),
  direction({
    id: 'todos',
    name: 'Guía para todos',
    tagline: 'Literata para leer, Atkinson para orientarse',
    summary:
      'La dirección elegida. Literata está diseñada para lectura; Atkinson Hyperlegible, para distinguir letras. Es la opción que mejor cumple “acercar la naturaleza a todo el mundo” sin renunciar a la calidez.',
    display: { name: 'Literata', stack: LITERATA, weight: 600 },
    body: { name: 'Literata', stack: LITERATA },
    ui: { name: 'Atkinson Hyperlegible', stack: ATKINSON, weight: 700 },
    scale: { title: 27, heading: 19, body: 16.5, small: 14, caption: 12.5 },
    leading: { title: 1.15, heading: 1.3, body: 1.6 },
    tracking: { title: '0', heading: '0' },
    notes: [
      'Atkinson separa letras y números que suelen confundirse; ideal para botones, cifras y labels.',
      'Literata da una lectura de libro sin caer en lo académico.',
      'La combinación más inclusiva de las cinco, también la más “de servicio público”.',
    ],
    watchOut: [
      'Atkinson es muy característica: reservarla a UI y datos, no a titulares.',
      'La mezcla necesita probar jerarquía y pesos para que no parezcan dos apps.',
    ],
  }),
];

/**
 * Las fuentes se cargan solo en este laboratorio.
 * En producción, si se adopta una dirección, se autoalojan en woff2
 * (`@fontsource-variable/*` o `@fontsource/*`) en lugar de depender de Google Fonts.
 */
const FAMILIES = [
  'Alegreya:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600',
  'Alegreya+Sans:wght@400;500;600;700',
  'Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700',
  'Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700',
  'Inter:wght@400;500;600;700',
  'Nunito+Sans:opsz,wght@6..12,400;6..12,600;6..12,700',
];

export const LAB_FONTS_HREF = `https://fonts.googleapis.com/css2?${FAMILIES.map(
  (family) => `family=${family}`,
).join('&')}&display=swap`;

export const DEFAULT_DIRECTION = 'todos';
