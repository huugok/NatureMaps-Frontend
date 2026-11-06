// Planta del inventario tal y como la pinta el mapa (F03.1). Es una vista mínima
// de `GET /trees`: posición, nombre a mostrar y si el inventario la asocia a una
// especie. El modelo de dominio completo (ficha, fuentes) llega por `/trees/:id`.

export interface PlantPin {
  id: number;
  /** Nombre común en el idioma pedido; si falta, científico o "Planta sin identificar". */
  displayName: string;
  latitude: number;
  longitude: number;
  /** true si el inventario asocia la planta a una especie conocida. */
  identified: boolean;
  /** Distancia en línea recta al usuario, en metros. Solo vía cercanas (RF2). */
  distance?: number;
  /** Plantas del mismo tipo agrupadas tras este marcador (>1: grupo, RF2). */
  count?: number;
}
