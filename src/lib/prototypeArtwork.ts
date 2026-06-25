import type { TattooRecord } from './schema';

export type PrototypeArtworkItem = {
  id: string;
  recordId: string;
  imageUrl: string;
  sourcePageUrl: string;
  title: string;
  alt: string;
  permissionStatus: 'needs_permission';
  collectedAt: string;
};

export type TattooRecordWithPrototypeArt = TattooRecord & {
  prototypeArtworkItems?: PrototypeArtworkItem[];
};

export type PrototypeArtworkPayload = {
  generatedAt: string;
  mode: 'local-prototype';
  records: Record<string, PrototypeArtworkItem[]>;
};

export function isPrototypeArtworkEnabled() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return import.meta.env.DEV || params.get('prototypeMedia') === 'true' || window.localStorage.getItem('tattoo-finder.prototype-media') === 'true';
}

export function mergePrototypeArtwork(records: TattooRecord[], payload: PrototypeArtworkPayload | null): TattooRecordWithPrototypeArt[] {
  if (!payload) return records;
  return records.map((record) => ({
    ...record,
    prototypeArtworkItems: payload.records[record.id] || [],
  }));
}

export function hasPrototypeArtwork(record: TattooRecordWithPrototypeArt) {
  return Boolean(record.prototypeArtworkItems?.length);
}
