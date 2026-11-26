export interface OfflineMapMetadata {
  code: string;
  sha256: string;
  bytes: number;
  bounds: [number, number, number, number];
  minZoom: number;
  maxZoom: number;
  sourceUrl: string;
  attribution: string;
  licenseUrl: string;
  url: string;
}
