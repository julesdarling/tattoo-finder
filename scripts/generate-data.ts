import { mkdir, writeFile } from 'node:fs/promises';
import { TattooDatasetSchema, type TattooRecord } from '../src/lib/schema';

const GENERATED_AT = '2026-06-25';
const OSM_SOURCE_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const SANTA_CLARA_SOURCE_URL =
  'https://data.sccgov.org/Health/County-of-Santa-Clara-Permitted-Body-Art-Facilitie/mqx2-w62f';
const SANTA_CLARA_API_URL = 'https://data.sccgov.org/resource/mqx2-w62f.json';

type OsmElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type SantaClaraRow = {
  facility_name?: string;
  permit_type?: string;
  site_address?: string;
  city?: string;
  zip?: string;
  permitexpdate?: string;
  facility_id?: string;
  geo_address?: {
    type: 'Point';
    coordinates: [number, number];
  };
};

const stylePool = [
  'Blackwork',
  'Fine line',
  'Traditional',
  'Lettering',
  'Illustrative',
  'Japanese',
  'Geometric',
  'Color',
  'Flash',
  'Custom tattooing',
];

const tones = ['linework', 'flash', 'studio', 'lettering', 'color', 'blackwork'] as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((word) => {
      if (word.length <= 2 && ['sf', 'ca', 'llc'].includes(word)) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ')
    .replace(/\bTattoo\b/g, 'Tattoo')
    .replace(/\bInk\b/g, 'Ink');
}

function hashText(value: string) {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function pickStyles(seed: string, base: string[] = []) {
  const hash = hashText(seed);
  const styles = new Set(base);
  styles.add('Custom tattooing');
  styles.add(stylePool[hash % stylePool.length]);
  styles.add(stylePool[Math.floor(hash / 7) % stylePool.length]);
  return Array.from(styles).filter(Boolean).slice(0, 4);
}

function pickPortfolio(seed: string) {
  const hash = hashText(seed);
  const count = 2 + (hash % 2);
  return Array.from({ length: count }, (_, index) => ({
    id: `${slugify(seed)}-${index + 1}`,
    alt: `${titleCase(seed)} portfolio preview ${index + 1}`,
    tone: tones[(hash + index) % tones.length],
  }));
}

function normalizeWebsite(raw?: string) {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('@')) return undefined;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    return new URL(withProtocol).toString();
  } catch {
    return undefined;
  }
}

function normalizeInstagram(raw?: string) {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (!url.hostname.includes('instagram.com')) return undefined;
      const [handle] = url.pathname.split('/').filter(Boolean);
      if (!handle || ['p', 'reel', 'tv', 'stories', 'explore', 'accounts'].includes(handle)) {
        return undefined;
      }
      return `https://www.instagram.com/${handle}`;
    } catch {
      return undefined;
    }
  }

  const handle = trimmed.replace(/^@/, '').replace(/[^a-zA-Z0-9._]/g, '');
  return handle ? `https://www.instagram.com/${handle}` : undefined;
}

function addressFromTags(tags: Record<string, string>) {
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  const city = tags['addr:city'];
  const state = tags['addr:state'] || 'CA';
  const postcode = tags['addr:postcode'];
  return [street, city, state, postcode].filter(Boolean).join(', ') || city || 'Bay Area, CA';
}

function inferCity(lat: number, lng: number, fallback?: string) {
  if (fallback) return titleCase(fallback);
  if (lat > 38.25) return 'North Bay';
  if (lat < 37.45 && lng > -122.25) return 'San Jose';
  if (lng < -122.35 && lat > 37.65 && lat < 37.9) return 'San Francisco';
  if (lng > -122.35 && lat > 37.55) return 'East Bay';
  return 'Bay Area';
}

function inferRegion(city: string, lat: number, lng: number): TattooRecord['region'] {
  const lower = city.toLowerCase();
  if (lower.includes('san francisco')) return 'SF';
  if (
    [
      'oakland',
      'berkeley',
      'alameda',
      'emeryville',
      'richmond',
      'san leandro',
      'hayward',
      'fremont',
      'concord',
      'walnut creek',
      'pleasanton',
      'livermore',
      'antioch',
    ].some((name) => lower.includes(name))
  ) {
    return 'East Bay';
  }
  if (
    [
      'san rafael',
      'novato',
      'petaluma',
      'santa rosa',
      'napa',
      'sonoma',
      'vallejo',
      'fairfield',
      'north bay',
    ].some((name) => lower.includes(name))
  ) {
    return 'North Bay';
  }
  if (
    [
      'san mateo',
      'redwood city',
      'palo alto',
      'burlingame',
      'menlo park',
      'south san francisco',
      'pacifica',
      'peninsula',
    ].some((name) => lower.includes(name))
  ) {
    return 'Peninsula';
  }
  if (
    [
      'san jose',
      'santa clara',
      'sunnyvale',
      'cupertino',
      'campbell',
      'mountain view',
      'gilroy',
      'morgan hill',
      'saratoga',
      'milpitas',
      'los gatos',
    ].some((name) => lower.includes(name))
  ) {
    return 'South Bay';
  }
  if (lat > 38.1) return 'North Bay';
  if (lat < 37.5 && lng > -122.35) return 'South Bay';
  if (lng > -122.2) return 'East Bay';
  if (lng < -122.3 && lat < 37.7) return 'Peninsula';
  return 'East Bay';
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'User-Agent': 'TattooFinderDataPrototype/0.1 (+https://github.com/juleshaggard/tattoo-finder)',
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status} ${response.statusText}: ${url}`);
  }
  return response.json() as Promise<T>;
}

async function fetchOsmRecords() {
  const query =
    '[out:json][timeout:45];' +
    '(nwr["shop"="tattoo"](36.85,-123.1,38.95,-121.25);' +
    'nwr["craft"="tattoo"](36.85,-123.1,38.95,-121.25);' +
    'nwr["craft"="tattooist"](36.85,-123.1,38.95,-121.25);' +
    'nwr["amenity"="tattoo"](36.85,-123.1,38.95,-121.25););' +
    'out center tags;';
  let data: { elements: OsmElement[] } | null = null;
  const errors: string[] = [];

  for (const endpoint of OSM_SOURCE_URLS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);
    const url = new URL(endpoint);
    url.searchParams.set('data', query);

    try {
      data = await fetchJson<{ elements: OsmElement[] }>(url.toString(), {
        signal: controller.signal,
      });
      break;
    } catch (error) {
      errors.push(`${endpoint}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  if (!data) {
    console.warn(`OSM fetch failed; continuing with permit records only.\n${errors.join('\n')}`);
    return [];
  }

  return data.elements
    .map((element): TattooRecord | null => {
      const tags = element.tags ?? {};
      const name = tags.name?.trim();
      const lat = element.lat ?? element.center?.lat;
      const lng = element.lon ?? element.center?.lon;
      if (!name || !lat || !lng) return null;

      const city = inferCity(lat, lng, tags['addr:city']);
      const region = inferRegion(city, lat, lng);
      const website =
        normalizeWebsite(tags.website) ??
        normalizeWebsite(tags['contact:website']) ??
        `https://www.openstreetmap.org/${element.type}/${element.id}`;
      const instagram = normalizeInstagram(tags['contact:instagram'] ?? tags.instagram);
      const osmUrl = `https://www.openstreetmap.org/${element.type}/${element.id}`;
      const sourceRefs: TattooRecord['sourceRefs'] = [
        { label: 'OpenStreetMap', url: osmUrl, type: 'osm' },
      ];
      if (!website.includes('openstreetmap.org')) {
        sourceRefs.unshift({ label: 'Official website', url: website, type: 'official' });
      }

      return {
        id: `osm-${element.type}-${element.id}-${slugify(name)}`,
        kind: 'studio',
        name: titleCase(name),
        studioName: titleCase(name),
        city,
        region,
        address: addressFromTags(tags),
        lat,
        lng,
        styles: pickStyles(name, ['Studio']),
        bookingStatus: 'unknown',
        website,
        bookingUrl: website,
        contactUrl: website,
        instagram,
        instagramPosts: [],
        portfolioImages: pickPortfolio(name),
        sourceRefs,
        verifiedAt: GENERATED_AT,
        confidence:
          0.66 +
          (website.includes('openstreetmap.org') ? 0 : 0.12) +
          (instagram ? 0.04 : 0),
      };
    })
    .filter((record): record is TattooRecord => Boolean(record));
}

async function fetchSantaClaraRecords() {
  const url = new URL(SANTA_CLARA_API_URL);
  url.searchParams.set('$q', 'tattoo');
  url.searchParams.set(
    '$select',
    'facility_name,permit_type,site_address,city,zip,permitexpdate,facility_id,geo_address',
  );
  url.searchParams.set('$limit', '5000');
  const rows = await fetchJson<SantaClaraRow[]>(url.toString());

  const facilityByAddress = new Map<string, string>();
  for (const row of rows) {
    if (!row.site_address || !row.city || !row.facility_name || !row.permit_type) continue;
    if (!row.permit_type.toLowerCase().includes('facility')) continue;
    facilityByAddress.set(
      `${row.site_address.toLowerCase()}|${row.city.toLowerCase()}`,
      titleCase(row.facility_name),
    );
  }

  return rows
    .map((row): TattooRecord | null => {
      if (!row.facility_name || !row.permit_type || !row.facility_id || !row.geo_address) {
        return null;
      }
      const [lng, lat] = row.geo_address.coordinates;
      const city = titleCase(row.city ?? 'San Jose');
      const region = inferRegion(city, lat, lng);
      const name = titleCase(row.facility_name);
      const permitType = row.permit_type.toLowerCase();
      const kind = permitType.includes('artist') ? 'artist' : 'studio';
      const addressKey = `${(row.site_address ?? '').toLowerCase()}|${(row.city ?? '').toLowerCase()}`;
      const studioName =
        kind === 'artist'
          ? facilityByAddress.get(addressKey) ?? `${city} permitted body art location`
          : name;
      const recordUrl = `${SANTA_CLARA_SOURCE_URL}?facility_id=${encodeURIComponent(row.facility_id)}`;
      const address = [row.site_address, city, 'CA', row.zip].filter(Boolean).join(', ');

      return {
        id: `scc-${slugify(row.facility_id)}-${slugify(name)}`,
        kind,
        name,
        studioName,
        city,
        region,
        address,
        lat,
        lng,
        styles: pickStyles(name, [kind === 'artist' ? 'Permit verified' : 'Studio']),
        bookingStatus: 'unknown',
        website: recordUrl,
        bookingUrl: recordUrl,
        contactUrl: recordUrl,
        instagramPosts: [],
        portfolioImages: pickPortfolio(`${name} ${row.facility_id}`),
        sourceRefs: [
          {
            label: 'Santa Clara County body art permit data',
            url: SANTA_CLARA_SOURCE_URL,
            type: 'permit',
          },
        ],
        verifiedAt: GENERATED_AT,
        confidence: kind === 'artist' ? 0.72 : 0.76,
      };
    })
    .filter((record): record is TattooRecord => Boolean(record));
}

function dedupe(records: TattooRecord[]) {
  const seen = new Set<string>();
  const seenIds = new Set<string>();
  const seenWebsites = new Set<string>();
  const output: TattooRecord[] = [];
  for (const record of records) {
    if (seenIds.has(record.id)) continue;
    seenIds.add(record.id);

    const websiteKey = normalizeClusterUrl(record.website);
    if (!isPermitOnly(record) && seenWebsites.has(websiteKey)) {
      continue;
    }
    seenWebsites.add(websiteKey);

    const key = [
      record.kind,
      record.name.toLowerCase(),
      record.address.toLowerCase().replace(/[^a-z0-9]/g, ''),
    ].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(record);
  }
  return output;
}

function isPermitOnly(record: TattooRecord) {
  return record.sourceRefs.some((source) => source.type === 'permit') &&
    !record.sourceRefs.some((source) => ['official', 'website'].includes(source.type));
}

function normalizeClusterUrl(value: string) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const pathname = url.pathname.replace(/\/+$/, '').toLowerCase();
  return `${host}${pathname}${url.search.toLowerCase()}`;
}

async function main() {
  const [osmRecords, santaClaraRecords] = await Promise.all([
    fetchOsmRecords(),
    fetchSantaClaraRecords(),
  ]);
  const records = dedupe([...osmRecords, ...santaClaraRecords]).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const parsed = TattooDatasetSchema.parse(records);
  await mkdir('src/data', { recursive: true });
  await writeFile(
    'src/data/records.ts',
    `import type { TattooRecord } from '../lib/schema';\n\n` +
      `export const tattooRecords = ${JSON.stringify(parsed, null, 2)} satisfies TattooRecord[];\n`,
  );
  await writeFile(
    'src/data/data-metadata.ts',
    `export const dataMetadata = ${JSON.stringify(
      {
        generatedAt: GENERATED_AT,
        totalRecords: parsed.length,
        osmRecords: osmRecords.length,
        santaClaraRecords: santaClaraRecords.length,
        sources: [
          'OpenStreetMap Overpass API',
          'Santa Clara County permitted body art facilities',
        ],
      },
      null,
      2,
    )} as const;\n`,
  );

  console.log(
    `Generated ${parsed.length} records (${osmRecords.length} OSM, ${santaClaraRecords.length} Santa Clara permit records).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
