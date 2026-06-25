import { tattooRecords } from '../src/data/records';
import { TattooDatasetSchema } from '../src/lib/schema';

const parsed = TattooDatasetSchema.parse(tattooRecords);

const duplicateIds = findDuplicates(parsed.map((record) => record.id));
const duplicateInstagram = findDuplicates(
  parsed
    .map((record) => record.instagram)
    .filter((value): value is string => Boolean(value))
    .map(normalizeInstagramProfile),
);
const duplicateWebsites = findDuplicates(
  parsed
    .filter((record) => !isPermitOnly(record))
    .map((record) => normalizeClusterUrl(record.website)),
);
const copiedInstagramMedia = parsed.flatMap((record) =>
  record.portfolioImages
    .filter((image) => image.url && /instagram|cdninstagram|fbcdn/i.test(image.url))
    .map((image) => `${record.id}:${image.url}`),
);
const recordsWithoutSources = parsed.filter((record) => record.sourceRefs.length === 0);
const outOfBounds = parsed.filter(
  (record) =>
    record.lat < 36.8 || record.lat > 39.2 || record.lng < -123.4 || record.lng > -120.8,
);

const failures = [
  duplicateIds.length && `Duplicate ids: ${duplicateIds.join(', ')}`,
  duplicateInstagram.length && `Duplicate Instagram profiles: ${duplicateInstagram.join(', ')}`,
  duplicateWebsites.length && `Duplicate websites: ${duplicateWebsites.join(', ')}`,
  copiedInstagramMedia.length && `Copied Instagram media: ${copiedInstagramMedia.join(', ')}`,
  recordsWithoutSources.length && `${recordsWithoutSources.length} records have no source refs`,
  outOfBounds.length && `${outOfBounds.length} records have out-of-bounds coordinates`,
].filter(Boolean);

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

const byKind = countBy(parsed.map((record) => record.kind));
const byRegion = countBy(parsed.map((record) => record.region));

console.log(
  JSON.stringify(
    {
      status: 'ok',
      totalRecords: parsed.length,
      byKind,
      byRegion,
      sourceRefs: parsed.reduce((sum, record) => sum + record.sourceRefs.length, 0),
    },
    null,
    2,
  ),
);

function findDuplicates(values: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return Array.from(duplicates);
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function isPermitOnly(record: (typeof parsed)[number]) {
  return record.sourceRefs.some((source) => source.type === 'permit') &&
    !record.sourceRefs.some((source) => ['official', 'website'].includes(source.type));
}

function normalizeInstagramProfile(value: string) {
  const url = new URL(value);
  const [handle = ''] = url.pathname.split('/').filter(Boolean);
  return handle.toLowerCase();
}

function normalizeClusterUrl(value: string) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const pathname = url.pathname.replace(/\/+$/, '').toLowerCase();
  return `${host}${pathname}${url.search.toLowerCase()}`;
}
