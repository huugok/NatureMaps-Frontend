// Ruta pintada recordada entre montajes del mapa. Se saca de MapPage porque
// Fast Refresh no aplica cambios en un módulo que exporta componentes y también
// funciones sueltas (el aviso "clearPaintedRoute export is incompatible").
let painted: number | null = null;

export function getPaintedRoute(): number | null { return painted; }
export function setPaintedRoute(id: number | null): void { painted = id; }
export function clearPaintedRoute(): void { painted = null; }
