import type { StringKey } from '../../i18n/strings';
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
  name: StringKey;
  tagline: StringKey;
  summary: StringKey;
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
  notes: StringKey[];
  watchOut: StringKey[];
}

interface DirectionInput {
  id: string;
  name: StringKey;
  tagline: StringKey;
  summary: StringKey;
  display: { name: string; stack: string; weight: number };
  body: { name: string; stack: string };
  ui: { name: string; stack: string; weight?: number };
  scale: TypeScale;
  leading: { title: number; heading: number; body: number };
  tracking: { title: string; heading: string; caption?: string };
  notes: StringKey[];
  watchOut: StringKey[];
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
    name: 'lab.direction.actual.name',
    tagline: 'lab.direction.actual.tagline',
    summary:
      'lab.direction.actual.summary',
    display: { name: 'Inter', stack: INTER, weight: 700 },
    body: { name: 'Inter', stack: INTER },
    ui: { name: 'Inter', stack: INTER },
    scale: { title: 24, heading: 18, body: 15, small: 13, caption: 11.5 },
    leading: { title: 1.15, heading: 1.3, body: 1.5 },
    tracking: { title: '-0.02em', heading: '-0.01em' },
    notes: [
      'lab.direction.actual.notes.0',
      'lab.direction.actual.notes.1',
    ],
    watchOut: [
      'lab.direction.actual.watchOut.0',
      'lab.direction.actual.watchOut.1',
    ],
  }),
  direction({
    id: 'guia',
    name: 'lab.direction.guia.name',
    tagline: 'lab.direction.guia.tagline',
    summary:
      'lab.direction.guia.summary',
    display: { name: 'Fraunces', stack: FRAUNCES, weight: 600 },
    body: { name: 'Inter', stack: INTER },
    ui: { name: 'Inter', stack: INTER },
    scale: { title: 26, heading: 18, body: 16, small: 13.5, caption: 12 },
    leading: { title: 1.1, heading: 1.3, body: 1.55 },
    tracking: { title: '-0.01em', heading: '-0.01em' },
    notes: [
      'lab.direction.guia.notes.0',
      'lab.direction.guia.notes.1',
      'lab.direction.guia.notes.2',
    ],
    watchOut: [
      'lab.direction.guia.watchOut.0',
      'lab.direction.guia.watchOut.1',
    ],
  }),
  direction({
    id: 'cuaderno',
    name: 'lab.direction.cuaderno.name',
    tagline: 'lab.direction.cuaderno.tagline',
    summary:
      'lab.direction.cuaderno.summary',
    display: { name: 'Alegreya', stack: ALEGREYA, weight: 600 },
    body: { name: 'Alegreya', stack: ALEGREYA },
    ui: { name: 'Alegreya Sans', stack: ALEGREYA_SANS },
    scale: { title: 27, heading: 19, body: 16.5, small: 14, caption: 12 },
    leading: { title: 1.12, heading: 1.3, body: 1.6 },
    tracking: { title: '0', heading: '0' },
    notes: [
      'lab.direction.cuaderno.notes.0',
      'lab.direction.cuaderno.notes.1',
      'lab.direction.cuaderno.notes.2',
    ],
    watchOut: [
      'lab.direction.cuaderno.watchOut.0',
      'lab.direction.cuaderno.watchOut.1',
    ],
  }),
  direction({
    id: 'sendero',
    name: 'lab.direction.sendero.name',
    tagline: 'lab.direction.sendero.tagline',
    summary:
      'lab.direction.sendero.summary',
    display: { name: 'Bricolage Grotesque', stack: BRICOLAGE, weight: 600 },
    body: { name: 'Nunito Sans', stack: NUNITO },
    ui: { name: 'Nunito Sans', stack: NUNITO },
    scale: { title: 26, heading: 18, body: 16, small: 14, caption: 12 },
    leading: { title: 1.1, heading: 1.3, body: 1.55 },
    tracking: { title: '-0.01em', heading: '-0.005em' },
    notes: [
      'lab.direction.sendero.notes.0',
      'lab.direction.sendero.notes.1',
    ],
    watchOut: [
      'lab.direction.sendero.watchOut.0',
      'lab.direction.sendero.watchOut.1',
    ],
  }),
  direction({
    id: 'todos',
    name: 'lab.direction.todos.name',
    tagline: 'lab.direction.todos.tagline',
    summary:
      'lab.direction.todos.summary',
    display: { name: 'Literata', stack: LITERATA, weight: 600 },
    body: { name: 'Literata', stack: LITERATA },
    ui: { name: 'Atkinson Hyperlegible', stack: ATKINSON, weight: 700 },
    scale: { title: 27, heading: 19, body: 16.5, small: 14, caption: 12.5 },
    leading: { title: 1.15, heading: 1.3, body: 1.6 },
    tracking: { title: '0', heading: '0' },
    notes: [
      'lab.direction.todos.notes.0',
      'lab.direction.todos.notes.1',
      'lab.direction.todos.notes.2',
    ],
    watchOut: [
      'lab.direction.todos.watchOut.0',
      'lab.direction.todos.watchOut.1',
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
