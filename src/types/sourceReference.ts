/** Procedencia aditiva de GET /species y /trees (UT 924). Una fecha de consulta
 * o importación no equivale a la fecha de publicación de la fuente. */
export interface SourceReference {
  name: string;
  provider: string | null;
  url: string;
  date: string | null;
  dateType: 'imported' | 'retrieved' | 'consulted' | null;
  version: string | null;
  scope: 'inventory' | 'editorial' | 'image';
  description: string;
}
