import type { TattooRecord } from './schema';

export const bayCenter = { lat: 37.7749, lng: -122.4194 };

export const regionOrder: Array<TattooRecord['region']> = [
  'SF',
  'East Bay',
  'North Bay',
  'Peninsula',
  'South Bay',
];

export function sourceLabel(record: TattooRecord) {
  if (record.sourceRefs.some((source) => source.type === 'official')) return 'Source verified';
  if (record.sourceRefs.some((source) => source.type === 'permit')) return 'Permit verified';
  if (record.sourceRefs.some((source) => source.type === 'osm')) return 'Map verified';
  return 'Source listed';
}

export function confidenceLabel(record: TattooRecord) {
  if (record.confidence >= 0.85) return 'High confidence';
  if (record.confidence >= 0.72) return 'Verified seed';
  return 'Needs review';
}

export function bookingLabel(record: TattooRecord) {
  const labels = {
    open: 'Known open books',
    waitlist: 'Waitlist listed',
    closed: 'Books closed',
    unknown: isPermitOnly(record) ? 'Permit only' : 'Check booking',
  } as const;
  return labels[record.bookingStatus];
}

export function primaryActionLabel(record: TattooRecord) {
  if (record.bookingStatus === 'open') return 'Book or contact';
  if (isPermitOnly(record)) return 'View permit source';
  return 'Visit official site';
}

export function isPermitOnly(record: TattooRecord) {
  return record.sourceRefs.some((source) => source.type === 'permit') &&
    !record.sourceRefs.some((source) => ['official', 'website'].includes(source.type));
}

export function displayDistance(
  record: TattooRecord,
  origin: { lat: number; lng: number } | null,
  distanceMiles: (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => number,
) {
  if (!origin) return null;
  return `${distanceMiles(origin, { lat: record.lat, lng: record.lng }).toFixed(1)} mi`;
}
