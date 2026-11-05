import type { StringKey } from '../../i18n/strings';
export interface PaletteTokens {
  accent: string;
  accent2: string;
  accentSoft: string;
  onAccent: string;
  app: string;
  surface: string;
  surface2: string;
  ink: string;
  ink2: string;
  muted: string;
  muted2: string;
  line: string;
  lineStrong: string;
  warm: string;
  warmStrong: string;
  night: string;
  danger: string;
}

export interface Palette {
  id: string;
  name: StringKey;
  tagline: StringKey;
  summary: StringKey;
  tokens: PaletteTokens;
  hex: PaletteTokens;
  notes: StringKey[];
  watchOut: StringKey[];
}

/**
 * Paletas en OKLCH. Cada rampa mantiene su hue y ajusta L/C por pasos.
 * Los hex son el equivalente sRGB redondeado para etiquetas y contraste;
 * la app usa los valores OKLCH.
 */
export const PALETTES: Palette[] = [
  {
    id: 'actual',
    name: 'lab.palette.actual.name',
    tagline: 'lab.palette.actual.tagline',
    summary:
      'lab.palette.actual.summary',
    tokens: {
      accent: 'oklch(0.469 0.09 153.4)',
      accent2: 'oklch(0.594 0.099 150.5)',
      accentSoft: 'oklch(0.939 0.024 125.2)',
      onAccent: 'oklch(1 0 0)',
      app: 'oklch(0.981 0.004 106.5)',
      surface: 'oklch(1 0 0)',
      surface2: 'oklch(0.965 0.004 100)',
      ink: 'oklch(0.278 0.03 256.8)',
      ink2: 'oklch(0.423 0.011 171.3)',
      muted: 'oklch(0.546 0.009 207.1)',
      muted2: 'oklch(0.701 0.007 197)',
      line: 'oklch(0 0 0 / 0.08)',
      lineStrong: 'oklch(0.881 0.008 106.6)',
      warm: 'oklch(0.655 0.11 74.6)',
      warmStrong: 'oklch(0.499 0.089 63.7)',
      night: 'oklch(0.238 0.038 152.3)',
      danger: 'oklch(0.657 0.173 23.1)',
    },
    hex: {
      accent: '#2b6942',
      accent2: '#4f8f5f',
      accentSoft: '#e7eedd',
      onAccent: '#ffffff',
      app: '#f9f9f6',
      surface: '#ffffff',
      surface2: '#f4f3f0',
      ink: '#1f2937',
      ink2: '#48504d',
      muted: '#6b7273',
      muted2: '#9aa0a0',
      line: '#00000014',
      lineStrong: '#d8d8d2',
      warm: '#b8863b',
      warmStrong: '#865727',
      night: '#102416',
      danger: '#e85d5d',
    },
    notes: [
      'lab.palette.actual.notes.0',
      'lab.palette.actual.notes.1',
    ],
    watchOut: [
      'lab.palette.actual.watchOut.0',
      'lab.palette.actual.watchOut.1',
    ],
  },
  {
    id: 'dehesa',
    name: 'lab.palette.dehesa.name',
    tagline: 'lab.palette.dehesa.tagline',
    summary:
      'lab.palette.dehesa.summary',
    tokens: {
      accent: 'oklch(0.445 0.088 151)',
      accent2: 'oklch(0.585 0.098 149)',
      accentSoft: 'oklch(0.945 0.026 132)',
      onAccent: 'oklch(1 0 0)',
      app: 'oklch(0.977 0.008 95)',
      surface: 'oklch(1 0 0)',
      surface2: 'oklch(0.958 0.008 95)',
      ink: 'oklch(0.275 0.018 140)',
      ink2: 'oklch(0.43 0.012 145)',
      muted: 'oklch(0.545 0.01 145)',
      muted2: 'oklch(0.705 0.008 140)',
      line: 'oklch(0.25 0.02 150 / 0.12)',
      lineStrong: 'oklch(0.885 0.01 110)',
      warm: 'oklch(0.67 0.105 75)',
      warmStrong: 'oklch(0.49 0.09 65)',
      night: 'oklch(0.225 0.035 150)',
      danger: 'oklch(0.6 0.165 25)',
    },
    hex: {
      accent: '#29613a',
      accent2: '#4f8c5b',
      accentSoft: '#e6f1df',
      onAccent: '#ffffff',
      app: '#f9f7f2',
      surface: '#ffffff',
      surface2: '#f3f1eb',
      ink: '#232a22',
      ink2: '#4c524c',
      muted: '#6d726d',
      muted2: '#9da19c',
      line: '#0000001f',
      lineStrong: '#d9dad2',
      warm: '#bb8b45',
      warmStrong: '#835522',
      night: '#0f2013',
      danger: '#d04f4b',
    },
    notes: [
      'lab.palette.dehesa.notes.0',
      'lab.palette.dehesa.notes.1',
    ],
    watchOut: [
      'lab.palette.dehesa.watchOut.0',
      'lab.palette.dehesa.watchOut.1',
    ],
  },
  {
    id: 'olivar',
    name: 'lab.palette.olivar.name',
    tagline: 'lab.palette.olivar.tagline',
    summary:
      'lab.palette.olivar.summary',
    tokens: {
      accent: 'oklch(0.465 0.075 115)',
      accent2: 'oklch(0.595 0.08 112)',
      accentSoft: 'oklch(0.945 0.025 100)',
      onAccent: 'oklch(1 0 0)',
      app: 'oklch(0.965 0.012 90)',
      surface: 'oklch(0.995 0.003 90)',
      surface2: 'oklch(0.944 0.012 90)',
      ink: 'oklch(0.27 0.02 70)',
      ink2: 'oklch(0.43 0.015 70)',
      muted: 'oklch(0.54 0.012 75)',
      muted2: 'oklch(0.7 0.01 80)',
      line: 'oklch(0.25 0.02 70 / 0.12)',
      lineStrong: 'oklch(0.875 0.012 85)',
      warm: 'oklch(0.625 0.115 45)',
      warmStrong: 'oklch(0.47 0.1 40)',
      night: 'oklch(0.22 0.025 100)',
      danger: 'oklch(0.595 0.165 27)',
    },
    hex: {
      accent: '#585e2a',
      accent2: '#80844a',
      accentSoft: '#f0eedb',
      onAccent: '#ffffff',
      app: '#f6f3eb',
      surface: '#fefdfb',
      surface2: '#efece4',
      ink: '#2d251c',
      ink2: '#554f47',
      muted: '#736e67',
      muted2: '#a29e98',
      line: '#0000001f',
      lineStrong: '#d9d5cd',
      warm: '#c06f4a',
      warmStrong: '#89452d',
      night: '#1d1b0d',
      danger: '#cf4e45',
    },
    notes: [
      'lab.palette.olivar.notes.0',
      'lab.palette.olivar.notes.1',
    ],
    watchOut: [
      'lab.palette.olivar.watchOut.0',
      'lab.palette.olivar.watchOut.1',
    ],
  },
  {
    id: 'turia',
    name: 'lab.palette.turia.name',
    tagline: 'lab.palette.turia.tagline',
    summary:
      'lab.palette.turia.summary',
    tokens: {
      accent: 'oklch(0.44 0.075 195)',
      accent2: 'oklch(0.58 0.085 192)',
      accentSoft: 'oklch(0.935 0.025 195)',
      onAccent: 'oklch(1 0 0)',
      app: 'oklch(0.975 0.008 200)',
      surface: 'oklch(1 0 0)',
      surface2: 'oklch(0.955 0.008 200)',
      ink: 'oklch(0.27 0.02 210)',
      ink2: 'oklch(0.43 0.012 210)',
      muted: 'oklch(0.54 0.012 210)',
      muted2: 'oklch(0.7 0.01 205)',
      line: 'oklch(0.25 0.02 210 / 0.12)',
      lineStrong: 'oklch(0.88 0.01 200)',
      warm: 'oklch(0.73 0.1 85)',
      warmStrong: 'oklch(0.5 0.09 75)',
      night: 'oklch(0.21 0.03 205)',
      danger: 'oklch(0.6 0.165 25)',
    },
    hex: {
      accent: '#005f5f',
      accent2: '#2e8a87',
      accentSoft: '#d7efef',
      onAccent: '#ffffff',
      app: '#f1f8f9',
      surface: '#ffffff',
      surface2: '#eaf2f2',
      ink: '#1b292c',
      ink2: '#495253',
      muted: '#677172',
      muted2: '#98a0a1',
      line: '#0000001f',
      lineStrong: '#d0dada',
      warm: '#c5a35a',
      warmStrong: '#815b1f',
      night: '#051c1f',
      danger: '#d04f4b',
    },
    notes: [
      'lab.palette.turia.notes.0',
      'lab.palette.turia.notes.1',
    ],
    watchOut: [
      'lab.palette.turia.watchOut.0',
      'lab.palette.turia.watchOut.1',
    ],
  },
  {
    id: 'azahar',
    name: 'lab.palette.azahar.name',
    tagline: 'lab.palette.azahar.tagline',
    summary:
      'lab.palette.azahar.summary',
    tokens: {
      accent: 'oklch(0.46 0.09 145)',
      accent2: 'oklch(0.59 0.1 143)',
      accentSoft: 'oklch(0.94 0.03 135)',
      onAccent: 'oklch(1 0 0)',
      app: 'oklch(0.975 0.008 90)',
      surface: 'oklch(1 0 0)',
      surface2: 'oklch(0.96 0.008 90)',
      ink: 'oklch(0.27 0.02 150)',
      ink2: 'oklch(0.43 0.012 150)',
      muted: 'oklch(0.545 0.01 150)',
      muted2: 'oklch(0.705 0.008 145)',
      line: 'oklch(0.25 0.02 145 / 0.12)',
      lineStrong: 'oklch(0.885 0.01 110)',
      warm: 'oklch(0.72 0.14 65)',
      warmStrong: 'oklch(0.48 0.11 58)',
      night: 'oklch(0.22 0.03 145)',
      danger: 'oklch(0.6 0.165 25)',
    },
    hex: {
      accent: '#356537',
      accent2: '#588c55',
      accentSoft: '#e3f0dc',
      onAccent: '#ffffff',
      app: '#f9f7f1',
      surface: '#ffffff',
      surface2: '#f4f2ec',
      ink: '#202921',
      ink2: '#4b524c',
      muted: '#6c726d',
      muted2: '#9da19d',
      line: '#0000001f',
      lineStrong: '#d9dad2',
      warm: '#e09036',
      warmStrong: '#8a4b0b',
      night: '#121e12',
      danger: '#d04f4b',
    },
    notes: [
      'lab.palette.azahar.notes.0',
      'lab.palette.azahar.notes.1',
    ],
    watchOut: [
      'lab.palette.azahar.watchOut.0',
      'lab.palette.azahar.watchOut.1',
    ],
  },
  {
    id: 'piedra',
    name: 'lab.palette.piedra.name',
    tagline: 'lab.palette.piedra.tagline',
    summary:
      'lab.palette.piedra.summary',
    tokens: {
      accent: 'oklch(0.48 0.055 135)',
      accent2: 'oklch(0.6 0.06 133)',
      accentSoft: 'oklch(0.93 0.018 120)',
      onAccent: 'oklch(1 0 0)',
      app: 'oklch(0.955 0.006 80)',
      surface: 'oklch(0.99 0.002 80)',
      surface2: 'oklch(0.925 0.006 80)',
      ink: 'oklch(0.26 0.012 80)',
      ink2: 'oklch(0.42 0.008 80)',
      muted: 'oklch(0.53 0.008 80)',
      muted2: 'oklch(0.69 0.006 80)',
      line: 'oklch(0.25 0.01 80 / 0.12)',
      lineStrong: 'oklch(0.865 0.008 80)',
      warm: 'oklch(0.63 0.09 50)',
      warmStrong: 'oklch(0.48 0.08 45)',
      night: 'oklch(0.23 0.02 100)',
      danger: 'oklch(0.6 0.165 25)',
    },
    hex: {
      accent: '#506545',
      accent2: '#728863',
      accentSoft: '#e6eadd',
      onAccent: '#ffffff',
      app: '#f2f0ec',
      surface: '#fcfcfa',
      surface2: '#e8e6e2',
      ink: '#27231e',
      ink2: '#4f4d48',
      muted: '#6e6b67',
      muted2: '#9d9b97',
      line: '#0000001f',
      lineStrong: '#d5d2cd',
      warm: '#b57956',
      warmStrong: '#834e36',
      night: '#1f1d12',
      danger: '#d04f4b',
    },
    notes: [
      'lab.palette.piedra.notes.0',
      'lab.palette.piedra.notes.1',
    ],
    watchOut: [
      'lab.palette.piedra.watchOut.0',
      'lab.palette.piedra.watchOut.1',
    ],
  },
];

export const DEFAULT_PALETTE = 'dehesa';

export const SWATCH_KEYS: Array<keyof PaletteTokens> = [
  'accent',
  'accent2',
  'accentSoft',
  'app',
  'surface',
  'surface2',
  'warm',
  'warmStrong',
  'ink',
  'muted',
  'night',
  'danger',
];

export const SWATCH_LABELS: Record<keyof PaletteTokens, StringKey> = {
  accent: 'lab.swatch.accent',
  accent2: 'lab.swatch.accent2',
  accentSoft: 'lab.swatch.accentSoft',
  onAccent: 'lab.swatch.onAccent',
  app: 'lab.swatch.app',
  surface: 'lab.swatch.surface',
  surface2: 'lab.swatch.surface2',
  ink: 'lab.swatch.ink',
  ink2: 'lab.swatch.ink2',
  muted: 'lab.swatch.muted',
  muted2: 'lab.swatch.muted2',
  line: 'lab.swatch.line',
  lineStrong: 'lab.swatch.lineStrong',
  warm: 'lab.swatch.warm',
  warmStrong: 'lab.swatch.warmStrong',
  night: 'lab.swatch.night',
  danger: 'lab.swatch.danger',
};
