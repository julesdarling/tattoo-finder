import type { BayRegion, TattooRecord } from './schema';
import { bayOrigins, defaultFilters, type Filters, type SortMode, type ViewMode } from './search';

const regions: Array<BayRegion | 'All'> = ['All', 'SF', 'East Bay', 'North Bay', 'Peninsula', 'South Bay'];
const sorts: SortMode[] = ['recommended', 'distance', 'confidence', 'name', 'portfolio'];
const kinds: Array<TattooRecord['kind'] | 'all'> = ['all', 'artist', 'studio'];

export function filtersFromParams(params: URLSearchParams, savedIds: string[]): Filters {
  const where = regions.includes(params.get('where') as BayRegion) ? (params.get('where') as BayRegion | 'All') : defaultFilters.where;
  const sort = sorts.includes(params.get('sort') as SortMode) ? (params.get('sort') as SortMode) : defaultFilters.sort;
  const kind = kinds.includes(params.get('kind') as TattooRecord['kind']) ? (params.get('kind') as TattooRecord['kind'] | 'all') : defaultFilters.kind;
  const hasCoordinateOrigin = params.has('lat') && params.has('lng');
  const lat = hasCoordinateOrigin ? Number(params.get('lat')) : Number.NaN;
  const lng = hasCoordinateOrigin ? Number(params.get('lng')) : Number.NaN;
  const origin = hasCoordinateOrigin && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : where !== 'All' ? bayOrigins[where] : null;

  return {
    q: params.get('q') || '',
    where,
    style: params.get('style') || 'All',
    radius: Number(params.get('radius') || defaultFilters.radius),
    origin,
    sort,
    openBooks: params.get('openBooks') === 'true',
    mediaOnly: params.get('mediaOnly') === 'true',
    kind,
    verifiedOnly: params.get('verifiedOnly') === 'true',
    savedOnly: params.get('savedOnly') === 'true',
    savedIds,
  };
}

export function paramsFromFilters(filters: Filters, view?: ViewMode) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.where !== 'All') params.set('where', filters.where);
  if (filters.style !== 'All') params.set('style', filters.style);
  if (filters.kind !== 'all') params.set('kind', filters.kind);
  if (filters.sort !== 'recommended') params.set('sort', filters.sort);
  if (filters.radius !== defaultFilters.radius) params.set('radius', String(filters.radius));
  if (filters.openBooks) params.set('openBooks', 'true');
  if (filters.mediaOnly) params.set('mediaOnly', 'true');
  if (filters.verifiedOnly) params.set('verifiedOnly', 'true');
  if (filters.savedOnly) params.set('savedOnly', 'true');
  if (filters.origin && filters.where === 'All') {
    params.set('lat', filters.origin.lat.toFixed(5));
    params.set('lng', filters.origin.lng.toFixed(5));
  }
  if (view) params.set('view', view);
  return params;
}

export function viewFromParams(params: URLSearchParams): ViewMode {
  return params.get('view') === 'map' ? 'map' : 'list';
}
