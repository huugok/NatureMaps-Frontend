import L from 'leaflet';
import { getCachedTile } from '../../services/offlineRead';
import { TILE_URL_TEMPLATE } from '../../services/offlineTiles';

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
    attribution: '&copy; OpenStreetMap contributors',
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
    void getCachedTile(url).then((blob) => {
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

export function addOfflineTileLayer(map: L.Map): L.TileLayer {
  return createOfflineTileLayer().addTo(map);
}
