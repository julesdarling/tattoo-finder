import type { TattooRecord } from './schema';

export function bookingLabel(record: TattooRecord) {
  const labels = {
    open: 'Books open',
    waitlist: 'Waitlist',
    closed: 'Books closed',
    unknown: 'Ask studio',
  };
  return labels[record.bookingStatus];
}

export function sourceLabel(record: TattooRecord) {
  if (record.sourceRefs.some((source) => source.type === 'official')) return 'Official source';
  if (record.sourceRefs.some((source) => source.type === 'permit')) return 'Permit record';
  if (record.sourceRefs.some((source) => source.type === 'osm')) return 'Map source';
  return 'Source linked';
}

export function confidenceLabel(record: TattooRecord) {
  if (record.confidence >= 0.82) return 'High confidence';
  if (record.confidence >= 0.68) return 'Medium confidence';
  return 'Needs verification';
}

export function primaryActionLabel(record: TattooRecord) {
  if (record.bookingStatus === 'open') return 'Contact for booking';
  if (record.bookingStatus === 'waitlist') return 'Join waitlist';
  return 'Verify availability';
}

export function portfolioLabel(record: TattooRecord) {
  const count = record.portfolioItems.length;
  if (count === 0) return 'Fallback preview';
  if (count === 1) return '1 portfolio ref';
  return `${count} portfolio refs`;
}
