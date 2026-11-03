import { useState, type CSSProperties } from 'react';
import { Check, Info, Leaf, MapPin, Search, Settings as SettingsIcon, X } from 'lucide-react';
import { Page } from '../../components/Page';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { ListItem } from '../../components/ui/ListItem';
import { StatusDot } from '../../components/ui/StatusDot';
import { cn } from '../../utils/cn';
import {
  DEFAULT_PALETTE,
  PALETTES,
  SWATCH_KEYS,
  SWATCH_LABELS,
  type Palette,
  type PaletteTokens,
} from './palettes';

const CSS_VAR_BY_TOKEN: Record<keyof PaletteTokens, string> = {
  accent: '--color-accent',
  accent2: '--color-accent-2',
  accentSoft: '--color-accent-soft',
  onAccent: '--color-on-accent',
  app: '--color-app',
  surface: '--color-surface',
  surface2: '--color-surface-2',
  ink: '--color-ink',
  ink2: '--color-ink-2',
  muted: '--color-muted',
  muted2: '--color-muted-2',
  line: '--color-line',
  lineStrong: '--color-line-strong',
  warm: '--color-warm',
  warmStrong: '--color-warm-strong',
  night: '--color-night',
  danger: '--color-danger',
};

function varsFor(palette: Palette): CSSProperties {
  const vars: Record<string, string> = {};
  for (const [token, cssVar] of Object.entries(CSS_VAR_BY_TOKEN)) {
    vars[cssVar] = palette.tokens[token as keyof PaletteTokens];
  }
  // La marca histórica (--color-green) apunta al acento para que StatusDot y
  // cualquier resto de la app se mantenga coherente.
  vars['--color-green'] = palette.tokens.accent;
  return vars as CSSProperties;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean
        .split('')
        .map((char) => char + char)
        .join('')
    : clean.slice(0, 6);
  const value = Number.parseInt(full, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const CONTRAST_PAIRS: Array<{
  label: string;
  foreground: keyof PaletteTokens;
  background: keyof PaletteTokens;
}> = [
  { label: 'Tinta sobre fondo de app', foreground: 'ink', background: 'app' },
  { label: 'Apagado sobre superficie', foreground: 'muted', background: 'surface' },
  { label: 'Blanco sobre acento', foreground: 'onAccent', background: 'accent' },
  { label: 'Cálido fuerte sobre fondo', foreground: 'warmStrong', background: 'app' },
  { label: 'Acento sobre acento suave', foreground: 'accent', background: 'accentSoft' },
];

function MiniApp({ palette }: { palette: Palette }) {
  return (
    <div className="rounded-panel bg-app p-4" style={varsFor(palette)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-title text-ink">Hola, explorador</p>
          <p className="text-small text-muted">Tu guía botánica y cultural de Valencia</p>
        </div>
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-on-accent">
          <SettingsIcon size={18} aria-hidden="true" />
        </span>
      </div>

      <div className="mt-3">
        <Badge solid>MODO AVENTURA</Badge>
      </div>

      <Card variant="accent" className="mt-3">
        <p className="font-display text-heading">Nature MAPS</p>
        <p className="mt-1 text-small opacity-85">
          Captura plantas, colecciona y sube de nivel
        </p>
      </Card>

      <div className="mt-3 space-y-2">
        <ListItem icon={Leaf} title="Identificar una planta" subtitle="Escanea una hoja o flor" />
        <ListItem icon={MapPin} title="Ver el mapa" subtitle="Árboles y rutas cerca de ti" />
      </div>

      <div className="mt-3 rounded-card bg-surface p-3 shadow-raised">
        <p className="text-caption uppercase tracking-wider text-muted">Especie más probable</p>
        <p className="font-display mt-1 text-heading text-ink">Jacaranda mimosifolia</p>
        <p className="text-small text-muted">Jacaranda · Bignoniaceae</p>
        <p className="font-body mt-2 text-body text-muted text-pretty">
          Árbol subtropical de flores violetas. En Valencia da sombra en avenidas y jardines
          desde finales de primavera.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="inline-flex min-h-7 items-center rounded-full bg-accent px-2.5 text-caption font-bold text-on-accent tabular-nums">
            Confianza: 91%
          </span>
          <span className="inline-flex min-h-7 items-center rounded-full bg-accent-soft px-2.5 text-caption font-bold text-accent tabular-nums">
            3 ejemplares
          </span>
          <span className="inline-flex min-h-7 items-center rounded-full bg-warm-strong px-2.5 text-caption font-bold text-on-accent">
            Ruta cultural
          </span>
          <span className="inline-flex min-h-7 items-center rounded-full bg-warm px-2.5 text-caption font-bold text-night">
            En floración
          </span>
        </div>
        <div className="mt-3 flex gap-2">
          <Button className="flex-1">Ver ficha</Button>
          <Button variant="secondary" className="flex-1">
            Ver mapa
          </Button>
        </div>
      </div>

      <div className="mt-3 rounded-card bg-surface-2 p-3 text-small text-muted">
        Superficie secundaria para paneles, estados vacíos y agrupaciones suaves.
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <StatusDot status="ok">Conectado</StatusDot>
        <StatusDot status="error">Sin conexión</StatusDot>
      </div>

      <div className="mt-3">
        <Input icon={Search} placeholder="Buscar una planta…" aria-label="Buscar una planta" />
      </div>

      <div className="mt-3 grid grid-cols-5 gap-1 border-t border-line pt-2 text-center text-caption">
        {['Inicio', 'Mapa', 'Escanear', 'Rutas', 'Buscar'].map((item, index) => (
          <span key={item} className={index === 0 ? 'font-bold text-accent' : 'text-muted'}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function Swatches({ palette }: { palette: Palette }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {SWATCH_KEYS.map((key) => (
        <div key={key}>
          <div
            className="h-12 rounded-control border border-line"
            style={{ backgroundColor: palette.tokens[key] }}
            title={`${SWATCH_LABELS[key]}: ${palette.tokens[key]}`}
          />
          <p className="mt-1 text-caption font-bold uppercase tracking-wider text-ink">
            {SWATCH_LABELS[key]}
          </p>
          <p className="text-caption text-muted">{palette.hex[key]}</p>
        </div>
      ))}
    </div>
  );
}

function ContrastList({ palette }: { palette: Palette }) {
  return (
    <ul className="divide-y divide-line rounded-card border border-line">
      {CONTRAST_PAIRS.map((pair) => {
        const ratio = contrast(palette.hex[pair.foreground], palette.hex[pair.background]);
        const passes = ratio >= 4.5;
        return (
          <li key={pair.label} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="text-small text-ink">{pair.label}</span>
            <span className="flex items-center gap-1.5 text-small tabular-nums text-muted">
              {ratio.toFixed(2)}:1
              {passes ? (
                <Check size={14} className="text-accent" aria-label="Cumple AA" />
              ) : (
                <X size={14} className="text-danger" aria-label="No cumple AA" />
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function ColorLab() {
  const [selectedId, setSelectedId] = useState(DEFAULT_PALETTE);
  const selected = PALETTES.find((palette) => palette.id === selectedId) ?? PALETTES[0];

  return (
    <Page title="Color" subtitle="Laboratorio de paletas" back settings={false}>
      <p className="text-body text-muted text-pretty">
        La dirección elegida es <strong>Verde dehesa</strong>: mismo bosque, tinta y papel
        templados. Las otras cinco quedan como referencia de lo que se descartó: Olivar y cal
        (mediterránea), Riu Turia (fresca), Azahar (valenciana), Piedra y musgo (sobria) y la
        paleta anterior.
      </p>

      <div role="group" aria-label="Paletas de color" className="flex flex-wrap gap-2">
        {PALETTES.map((palette) => {
          const active = palette.id === selected.id;
          return (
            <button
              key={palette.id}
              type="button"
              aria-pressed={active}
              onClick={() => setSelectedId(palette.id)}
              className={cn(
                'flex min-h-11 items-center gap-2 rounded-full px-3.5 text-small font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
                active ? 'bg-accent text-on-accent shadow-raised' : 'bg-surface text-ink shadow-raised',
              )}
            >
              <span
                className="size-3 rounded-full border border-black/10"
                style={{ backgroundColor: palette.tokens.accent }}
                aria-hidden="true"
              />
              {palette.name}
            </button>
          );
        })}
      </div>

      <section
        id="color-lab-preview"
        aria-label="Vista previa de la paleta"
        className="mt-1 rounded-panel bg-surface p-4 shadow-raised"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-display text-heading text-ink">{selected.name}</h2>
            <p className="mt-0.5 text-small text-muted">{selected.tagline}</p>
          </div>
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-caption uppercase tracking-wider text-accent">
            {selected.id === 'dehesa'
              ? 'Aplicada'
              : selected.id === 'actual'
                ? 'Anterior'
                : 'Alternativa'}
          </span>
        </div>

        <p className="mt-2 text-small text-muted text-pretty">{selected.summary}</p>

        <div className="mt-4 overflow-hidden rounded-panel">
          <MiniApp palette={selected} />
        </div>

        <div className="mt-4">
          <p className="text-caption uppercase tracking-wider text-muted">Fichas de color</p>
          <div className="mt-2">
            <Swatches palette={selected} />
          </div>
        </div>

        <div className="mt-4">
          <p className="text-caption uppercase tracking-wider text-muted">Contraste WCAG AA</p>
          <div className="mt-2">
            <ContrastList palette={selected} />
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <div>
            <p className="text-caption uppercase tracking-wider text-muted">Por qué funciona</p>
            <ul className="mt-1.5 space-y-1.5">
              {selected.notes.map((note) => (
                <li key={note} className="flex gap-2 text-small text-ink">
                  <Check size={15} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-caption uppercase tracking-wider text-muted">A vigilar</p>
            <ul className="mt-1.5 space-y-1.5">
              {selected.watchOut.map((note) => (
                <li key={note} className="flex gap-2 text-small text-muted">
                  <Info size={15} className="mt-0.5 shrink-0 text-warm-strong" aria-hidden="true" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <details className="rounded-panel bg-surface p-4 shadow-raised">
        <summary className="cursor-pointer text-body font-semibold text-ink">
          Comparar las seis paletas
        </summary>
        <div className="mt-4 space-y-2">
          {PALETTES.map((palette) => (
            <div
              key={palette.id}
              className="rounded-card border border-line p-3"
              style={{ backgroundColor: palette.tokens.app, color: palette.tokens.ink }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-small font-semibold" style={{ color: palette.tokens.ink }}>
                  {palette.name}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(palette.id);
                    document.getElementById('color-lab-preview')?.scrollIntoView({ block: 'start' });
                  }}
                  className="min-h-9 shrink-0 rounded-full px-2 text-caption font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  style={{ color: palette.tokens.accent }}
                >
                  Ver en grande
                </button>
              </div>
              <div className="mt-2 flex gap-1">
                {(['accent', 'accent2', 'accentSoft', 'warm', 'ink'] as const).map((key) => (
                  <span
                    key={key}
                    className="h-6 flex-1 rounded-sm"
                    style={{ backgroundColor: palette.tokens[key] }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>

      <p className="text-caption text-muted text-pretty">
        Colores en OKLCH: cada rampa conserva su hue y ajusta luminosidad y croma. Los hex son el
        equivalente sRGB para etiquetas y cálculo de contraste. La app usa los tokens de
        <code className="mx-1">src/index.css</code>.
      </p>
    </Page>
  );
}

export default ColorLab;
