import type { BayRegion, TattooRecord } from './schema';

export type SortMode = 'recommended' | 'distance' | 'confidence' | 'name' | 'portfolio';
export type ViewMode = 'list' | 'map';

export type Filters = {
  q: string;
  where: BayRegion | 'All';
  style: string;
  radius: number;
  origin: { lat: number; lng: number } | null;
  sort: SortMode;
  openBooks: boolean;
  mediaOnly: boolean;
  kind: TattooRecord['kind'] | 'all';
  verifiedOnly: boolean;
  savedOnly: boolean;
  savedIds: string[];
};

export const defaultFilters: Filters = {
  q: '',
  where: 'All',
  style: 'All',
  radius: 50,
  origin: null,
  sort: 'recommended',
  openBooks: false,
  mediaOnly: false,
  kind: 'all',
  verifiedOnly: false,
  savedOnly: false,
  savedIds: [],
};

export const bayOrigins: Record<BayRegion, { lat: number; lng: number }> = {
  SF: { lat: 37.7749, lng: -122.4194 },
  'East Bay': { lat: 37.8044, lng: -122.2712 },
  'North Bay': { lat: 38.4404, lng: -122.7141 },
  Peninsula: { lat: 37.563, lng: -122.3255 },
  'South Bay': { lat: 37.3382, lng: -121.8863 },
};

const toSearchText = (record: TattooRecord) =>
  [
    record.name,
    record.studioName,
    record.city,
    record.region,
    record.styles.join(' '),
    record.address,
    record.portfolioItems.map((item) => `${item.title} ${item.styleTags.join(' ')}`).join(' '),
  ]
    .join(' ')
    .toLowerCase();

export function distanceMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(h));
}

export function sortRecords(records: TattooRecord[], sort: SortMode, origin: Filters['origin'] = null) {
  return [...records].sort((a, b) => {
    if (sort === 'distance' && origin) {
      return distanceMiles(origin, { lat: a.lat, lng: a.lng }) - distanceMiles(origin, { lat: b.lat, lng: b.lng });
    }
    if (sort === 'confidence') return b.confidence - a.confidence || a.name.localeCompare(b.name);
    if (sort === 'name') return a.name.localeCompare(b.name);
    if (sort === 'portfolio') return b.portfolioItems.length - a.portfolioItems.length || b.confidence - a.confidence;

    const bookingWeight = { open: 0, waitlist: 1, unknown: 2, closed: 3 };
    return (
      b.portfolioItems.length - a.portfolioItems.length ||
      bookingWeight[a.bookingStatus] - bookingWeight[b.bookingStatus] ||
      b.confidence - a.confidence ||
      a.name.localeCompare(b.name)
    );
  });
}

export function filterRecords(records: TattooRecord[], filters: Filters) {
  const query = filters.q.trim().toLowerCase();
  const filtered = records.filter((record) => {
    if (query && !toSearchText(record).includes(query)) return false;
    if (filters.where !== 'All' && record.region !== filters.where) return false;
    if (filters.style !== 'All' && !record.styles.includes(filters.style)) return false;
    if (filters.openBooks && record.bookingStatus !== 'open') return false;
    if (filters.mediaOnly && record.portfolioItems.length === 0) return false;
    if (filters.kind !== 'all' && record.kind !== filters.kind) return false;
    if (filters.verifiedOnly && !isSourceVerified(record)) return false;
    if (filters.savedOnly && !filters.savedIds.includes(record.id)) return false;
    if (filters.origin) {
      const miles = distanceMiles(filters.origin, { lat: record.lat, lng: record.lng });
      if (miles > filters.radius) return false;
    }
    return true;
  });
  return sortRecords(filtered, filters.sort, filters.origin);
}

export function getAvailableStyles(records: TattooRecord[]) {
  return Array.from(new Set(records.flatMap((record) => record.styles))).sort((a, b) => a.localeCompare(b));
}

export function getCities(records: TattooRecord[]) {
  return Array.from(new Set(records.map((record) => record.city))).sort((a, b) => a.localeCompare(b));
}

export function isSourceVerified(record: TattooRecord) {
  return record.sourceRefs.some((source) => source.type === 'official' || source.type === 'website') || record.confidence >= 0.75;
}
