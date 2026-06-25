import { Search, SlidersHorizontal } from 'lucide-react';
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { tattooRecords } from './data/records';
import { dataMetadata } from './data/data-metadata';
import { BrandMark } from './components/BrandMark';
import { DetailSheet } from './components/DetailSheet';
import { FilterPanel } from './components/FilterPanel';
import { ResultsList } from './components/ResultsList';
import { defaultFilters, filterRecords, getAvailableStyles, type Filters } from './lib/search';
import { readSavedIds, toggleSavedId } from './lib/saved';
import type { TattooRecord } from './lib/schema';
import { cn } from './lib/cn';

type MobileSurface = 'list' | 'map';

const MapPanel = lazy(() =>
  import('./components/MapPanel').then((module) => ({ default: module.MapPanel })),
);

function App() {
  const records = tattooRecords;
  const [filters, setFilters] = useState<Filters>(() => readFiltersFromUrl());
  const [savedIds, setSavedIds] = useState<string[]>(() => readSavedIds());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileSurface, setMobileSurface] = useState<MobileSurface>('list');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const styles = useMemo(() => getAvailableStyles(records), [records]);
  const cities = useMemo(
    () => Array.from(new Set(records.map((record) => record.city))).sort((a, b) => a.localeCompare(b)),
    [records],
  );
  const visibleRecords = useMemo(
    () => filterRecords(records, { ...filters, savedIds }),
    [records, filters, savedIds],
  );
  const selectedRecord = useMemo(
    () =>
      selectedId
        ? visibleRecords.find((record) => record.id === selectedId) ??
          records.find((record) => record.id === selectedId) ??
          null
        : null,
    [records, selectedId, visibleRecords],
  );

  useEffect(() => {
    const next = writeFiltersToUrl(filters);
    window.history.replaceState({}, '', next);
  }, [filters]);

  const updateFilters = (nextFilters: Filters) => setFilters(nextFilters);
  const resetFilters = () => {
    setFilters(defaultFilters);
    setGeoError(null);
  };
  const toggleSave = (id: string) => setSavedIds(toggleSavedId(id));
  const selectRecord = (record: TattooRecord) => {
    setSelectedId(record.id);
  };

  const locate = () => {
    if (!navigator.geolocation) {
      setGeoError('Location is unavailable in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoError(null);
        setFilters({
          ...filters,
          origin: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          sort: 'distance',
        });
      },
      () => setGeoError('Location permission was denied. Search or choose a region instead.'),
      { enableHighAccuracy: false, timeout: 8_000 },
    );
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-row">
          <BrandMark />
          <div>
            <p className="eyebrow">Bay Area</p>
            <h1>Tattoo Finder</h1>
          </div>
        </div>

        <label className="search-field">
          <span>Search artists, studios, cities, styles</span>
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={filters.q}
            onChange={(event) => setFilters({ ...filters, q: event.target.value })}
            placeholder="Fine line in Oakland"
            aria-label="Search artists, studios, cities, styles"
          />
        </label>

        <button className="button button-dark filter-launch" onClick={() => setFiltersOpen(true)}>
          <SlidersHorizontal size={17} aria-hidden="true" />
          Filters
        </button>
      </header>

      <section className="mobile-summary" aria-label="Dataset summary">
        <span>{dataMetadata.totalRecords} records</span>
        <span>{savedIds.length} saved</span>
        <span>Showing {visibleRecords.length}</span>
      </section>

      <div className="mobile-tabs" role="group" aria-label="Mobile view">
        <button
          type="button"
          className={cn(mobileSurface === 'list' && 'is-active')}
          onClick={() => setMobileSurface('list')}
        >
          Show list
        </button>
        <button
          type="button"
          className={cn(mobileSurface === 'map' && 'is-active')}
          onClick={() => setMobileSurface('map')}
        >
          Show map
        </button>
      </div>

      <div className={cn('workspace', selectedRecord && 'has-detail')}>
        {filtersOpen ? (
          <div className="filters-drawer is-open">
            <button
              className="drawer-scrim"
              type="button"
              aria-label="Close filters"
              onClick={() => setFiltersOpen(false)}
            />
            <FilterPanel
              filters={filters}
              styles={styles}
              cities={cities}
              onChange={updateFilters}
              onLocate={locate}
              onReset={resetFilters}
              geoError={geoError}
            />
          </div>
        ) : null}

        <FilterPanel
          filters={filters}
          styles={styles}
          cities={cities}
          onChange={updateFilters}
          onLocate={locate}
          onReset={resetFilters}
          geoError={geoError}
        />

        <section
          className={cn('results-column', mobileSurface !== 'list' && 'mobile-hidden')}
          aria-label="Browse results"
        >
          <div className="results-head">
            <div>
              <p className="eyebrow">{dataMetadata.totalRecords} records</p>
              <h2>Showing {visibleRecords.length}</h2>
            </div>
            <span>{savedIds.length} saved</span>
          </div>
          <ResultsList
            records={visibleRecords}
            selectedId={selectedId}
            savedIds={savedIds}
            origin={filters.origin}
            onOpen={(record) => setSelectedId(record.id)}
            onSave={toggleSave}
          />
        </section>

        <div className={cn('map-column', mobileSurface !== 'map' && 'mobile-hidden')}>
          <Suspense fallback={<section className="map-loading">Loading map</section>}>
            <MapPanel records={visibleRecords} selectedId={selectedId} onSelect={selectRecord} />
          </Suspense>
        </div>

        <DetailSheet
          record={selectedRecord}
          saved={selectedRecord ? savedIds.includes(selectedRecord.id) : false}
          onClose={() => setSelectedId(null)}
          onSave={toggleSave}
        />
      </div>
    </main>
  );
}

function readFiltersFromUrl(): Filters {
  const params = new URLSearchParams(window.location.search);
  return {
    ...defaultFilters,
    q: params.get('q') ?? '',
    region: (params.get('region') as Filters['region']) || defaultFilters.region,
    style: params.get('style') ?? defaultFilters.style,
    radius: Number(params.get('radius') ?? defaultFilters.radius),
    sort: (params.get('sort') as Filters['sort']) || defaultFilters.sort,
    openBooks: params.get('openBooks') === 'true',
  };
}

function writeFiltersToUrl(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.region !== defaultFilters.region) params.set('region', filters.region);
  if (filters.style !== defaultFilters.style) params.set('style', filters.style);
  if (filters.radius !== defaultFilters.radius) params.set('radius', String(filters.radius));
  if (filters.sort !== defaultFilters.sort) params.set('sort', filters.sort);
  if (filters.openBooks) params.set('openBooks', 'true');

  const search = params.toString();
  return `${window.location.pathname}${search ? `?${search}` : ''}`;
}

export default App;
