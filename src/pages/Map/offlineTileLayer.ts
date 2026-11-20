import L from 'leaflet';
import { getCachedTile } from '../../services/offlineRead';
import { TILE_URL_TEMPLATE } from '../../services/offlineTiles';
import { fetchMapMetadata, savedBasemap } from '../../services/offlineMap';
import { API_URL } from '../../services/api';

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

/** Podrá usar PMTiles local incluso tras reabrir la app sin conexión. OSM es
 * únicamente el fallback de visualización cuando no hay paquete disponible. */
export function addOfflineTileLayer(map: L.Map): L.LayerGroup {
  const group = L.layerGroup();
  group.addTo(map);
  let closed = false;
  let generation = 0;
  let activeLayer: L.Layer | undefined;
  const controller = new AbortController();
  const refresh = async () => {
    const job = ++generation;
    try {
      const local = await savedBasemap();
      const metadata = local?.metadata ?? await fetchMapMetadata(controller.signal);
      if (!metadata?.sha256 || !Array.isArray(metadata.bounds)) throw new Error('Mapa no preparado');
      // El renderer se carga bajo demanda; las reglas y fuentes son locales.
      const [{ leafletLayer }, { PMTiles, FileSource }] = await Promise.all([import('protomaps-leaflet'), import('pmtiles')]);
      if (closed || job !== generation) return;
      (window as Window & { L?: typeof L }).L ??= L;
      const archive = new PMTiles(local
        ? new FileSource(new File([local.blob], `${metadata.sha256}.pmtiles`))
        : `${API_URL}${metadata.url}`);
      await archive.getHeader();
      if (closed || job !== generation) return;
      const next = leafletLayer({ url: archive, flavor: 'light', lang: 'es', maxDataZoom: metadata.maxZoom,
        maxZoom: 19, noWrap: true, bounds: [[metadata.bounds[1], metadata.bounds[0]], [metadata.bounds[3], metadata.bounds[2]]],
        attribution: '<a href="https://protomaps.com">Protomaps</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }) as unknown as L.Layer;
      if (activeLayer) group.removeLayer(activeLayer);
      activeLayer = next;
      next.addTo(group);
    } catch {
      if (!closed && job === generation) {
        // El proveedor público solo se usa al visualizar online, nunca al descargar.
        if (activeLayer) group.removeLayer(activeLayer);
        activeLayer = createOfflineTileLayer();
        activeLayer.addTo(group);
      }
    }
  };
  void refresh();
  window.addEventListener('naturemaps-route-downloads', refresh);
  map.on('unload', () => {
    closed = true; controller.abort();
    window.removeEventListener('naturemaps-route-downloads', refresh);
  });
  return group;
}
