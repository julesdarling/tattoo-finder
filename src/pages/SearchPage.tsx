import { Heart, List, Map, SlidersHorizontal, X } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import { DetailSheet } from '../components/DetailSheet';
import { FilterPanel } from '../components/FilterPanel';
import { ListingCard } from '../components/ListingCard';
import { SearchPill } from '../components/SearchPill';
import { tattooRecords } from '../data';
import { bayOrigins, filterRecords, getAvailableStyles, type Filters } from '../lib/search';
import { readSavedIds, toggleSavedId } from '../lib/saved';
import type { TattooRecord } from '../lib/schema';
import { filtersFromParams, paramsFromFilters, viewFromParams } from '../lib/urlState';
import type { ViewMode } from '../lib/search';
import { cn } from '../lib/cn';

const MapPanel = lazy(() => import('../components/MapPanel').then((module) => ({ default: module.MapPanel })));

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<TattooRecord | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const styles = useMemo(() => getAvailableStyles(tattooRecords), []);
  const filters = useMemo(() => filtersFromParams(params, savedIds), [params, savedIds]);
  const view = viewFromParams(params);
  const results = useMemo(() => filterRecords(tattooRecords, filters), [filters]);

  useEffect(() => {
    setSavedIds(readSavedIds());
  }, []);

  useEffect(() => {
    window.localStorage.setItem('tattoo-finder.last-search', `/search?${params.toString()}`);
  }, [params]);

  useEffect(() => {
    function closeOverlays(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setFiltersOpen(false);
      setSelected(null);
    }

    window.addEventListener('keydown', closeOverlays);
    return () => window.removeEventListener('keydown', closeOverlays);
  }, []);

  function updateFilters(next: Partial<Filters>, nextView = view) {
    const merged = { ...filters, ...next };
    if (next.where && !next.origin) {
      merged.origin = next.where === 'All' ? null : bayOrigins[next.where];
    }
    setParams(paramsFromFilters(merged, nextView));
  }

  function setView(nextView: ViewMode) {
    setParams(paramsFromFilters(filters, nextView));
  }

  function save(id: string) {
    setSavedIds(toggleSavedId(id));
  }

  return (
    <main className="app-shell search-shell">
      <header className="results-nav">
        <BrandMark />
        <SearchPill
          compact
          styles={styles}
          initial={{ q: filters.q, where: filters.where, style: filters.style, openBooks: filters.openBooks, mediaOnly: filters.mediaOnly }}
        />
        <button className="saved-link" type="button" onClick={() => updateFilters({ savedOnly: !filters.savedOnly })}>
          <Heart size={17} fill={filters.savedOnly ? 'currentColor' : 'none'} aria-hidden="true" />
          {savedIds.length} saved
        </button>
      </header>

      <div className="mobile-actions">
        <button type="button" onClick={() => setFiltersOpen(true)}>
          <SlidersHorizontal size={17} aria-hidden="true" />
          Filters
        </button>
        <button className={cn(view === 'list' && 'is-active')} type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>
          <List size={17} aria-hidden="true" />
          List
        </button>
        <button className={cn(view === 'map' && 'is-active')} type="button" aria-pressed={view === 'map'} onClick={() => setView('map')}>
          <Map size={17} aria-hidden="true" />
          Map
        </button>
      </div>

      <section className={cn('results-layout', view === 'map' && 'mobile-map-active')}>
        <FilterPanel
          filters={filters}
          styles={styles}
          onChange={(next) => updateFilters(next)}
          onReset={() => setParams(paramsFromFilters({ ...filters, q: '', where: 'All', style: 'All', radius: 50, sort: 'recommended', openBooks: false, mediaOnly: false, kind: 'all', verifiedOnly: false, savedOnly: false, origin: null }))}
        />

        <section className="results-list-column" aria-label="Search results">
          <div className="results-summary">
            <div>
              <p className="eyebrow">{results.length} results</p>
              <h1>{filters.q || filters.where !== 'All' || filters.style !== 'All' ? 'Matching artists and studios' : 'Bay Area tattoo artists'}</h1>
            </div>
            <button className="desktop-filter-button" type="button" onClick={() => setFiltersOpen(true)}>
              <SlidersHorizontal size={17} aria-hidden="true" />
              Refine
            </button>
          </div>

          {results.length ? (
            <div className="results-grid">
              {results.slice(0, 96).map((record, index) => (
                <ListingCard
                  key={record.id}
                  record={record}
                  saved={savedIds.includes(record.id)}
                  onSave={save}
                  onOpen={setSelected}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p className="eyebrow">No matches</p>
              <h2>Try a wider region or fewer filters.</h2>
              <button className="button primary" type="button" onClick={() => setParams(new URLSearchParams())}>Clear search</button>
            </div>
          )}
        </section>

        <aside className="map-column" aria-label="Map results">
          <Suspense fallback={<div className="map-loading">Loading map</div>}>
            <MapPanel records={results} selectedId={selected?.id} onSelect={setSelected} />
          </Suspense>
        </aside>
      </section>

      {filtersOpen ? (
        <div className="drawer-layer" role="dialog" aria-modal="true" aria-label="Filters">
          <button className="drawer-scrim" type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters" />
          <FilterPanel
            open
            filters={filters}
            styles={styles}
            onChange={(next) => updateFilters(next)}
            onReset={() => setParams(new URLSearchParams())}
            onClose={() => setFiltersOpen(false)}
          />
          <button className="drawer-close" type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {selected ? <DetailSheet record={selected} saved={savedIds.includes(selected.id)} onClose={() => setSelected(null)} onSave={save} /> : null}
    </main>
  );
}
