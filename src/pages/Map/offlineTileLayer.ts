import L from 'leaflet';
import { getCachedTile } from '../../services/offlineRead';
import { TILE_URL_TEMPLATE } from '../../services/offlineTiles';
import { getRouteCachedTile } from '../../services/offlineRouteRead';
import { routeStore } from '../../services/offlineRouteStorage';

/**
 * Capa de teselas de OpenStreetMap que mira primero en las teselas guardadas
 * (zonas descargadas) y solo si no están pide la tesela a la red. Así el mapa
 * se pinta sin conexión en las zonas descargadas y no cambia en el resto.
 *
 * Se crea con `L.tileLayer` y se sustituye `createTile` en la instancia (en
 * lugar de heredar de `L.TileLayer`) para no depender de la clase al importar.
 */
export function createOfflineTileLayer(): L.TileLayer {
  const layer = L.tileLayer(TILE_URL_TEMPLATE, {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
  });
  // `createTile` es protegido en los tipos de Leaflet, pero es el punto de extensión documentado.
  (layer as unknown as { createTile: (this: L.TileLayer, coords: L.Coords, done: L.DoneCallback) => HTMLElement }).createTile = function createTile(this: L.TileLayer, coords: L.Coords, done: L.DoneCallback): HTMLElement {
    const tile = document.createElement('img');
    tile.alt = '';
    tile.setAttribute('role', 'presentation');
    const url = this.getTileUrl(coords);
    let objectUrl: string | null = null;
    const release = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    };
    tile.onload = () => {
      release();
      done(undefined, tile);
    };
    tile.onerror = () => {
      release();
      done(new Error(`tile ${url}`), tile);
    };
    void getCachedTile(url).then(async (saved) => saved ?? await getRouteCachedTile(url)).then((blob) => {
      if (blob) {
        objectUrl = URL.createObjectURL(blob);
        tile.src = objectUrl;
      } else {
        tile.src = url;
      }
    });
    return tile;
  };
  return layer;
}


/** La misma capa raster que las zonas, con lectura adicional de las rutas. */
export function addOfflineTileLayer(map: L.Map): L.TileLayer {
  const layer = createOfflineTileLayer().addTo(map);
  let closed = false;
  const refresh = async () => {
    try {
      const records = await routeStore().all();
      if (closed) return;
      const maps = records.flatMap((record) => record.tiles ? [record.tiles] : []);
      // Fuera del zoom guardado se amplía la tesela disponible. La red online
      // conserva su detalle habitual; offline no se inventan niveles ausentes.
      if (navigator.onLine === false && maps.length) {
        layer.options.minNativeZoom = Math.min(...maps.map((tiles) => tiles.minZoom));
        layer.options.maxNativeZoom = Math.min(...maps.map((tiles) => tiles.maxZoom));
      } else {
        delete layer.options.minNativeZoom;
        delete layer.options.maxNativeZoom;
      }
      layer.redraw();
    } catch { /* La falta de IndexedDB no impide el mapa online. */ }
  };
  void refresh();
  window.addEventListener('naturemaps-route-downloads', refresh);
  window.addEventListener('online', refresh);
  window.addEventListener('offline', refresh);
  map.on('unload', () => {
    closed = true;
    window.removeEventListener('naturemaps-route-downloads', refresh);
    window.removeEventListener('online', refresh);
    window.removeEventListener('offline', refresh);
  });
  return layer;
}
