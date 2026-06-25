import { Filter, LocateFixed, RotateCcw, SlidersHorizontal } from 'lucide-react';
import type { Filters, SortMode } from '../lib/search';
import type { TattooRecord } from '../lib/schema';
import { regionOrder } from '../lib/recordMeta';
import { cn } from '../lib/cn';

type FilterPanelProps = {
  filters: Filters;
  styles: string[];
  cities: string[];
  onChange: (filters: Filters) => void;
  onLocate: () => void;
  onReset: () => void;
  geoError?: string | null;
};

export function FilterPanel({
  filters,
  styles,
  cities,
  onChange,
  onLocate,
  onReset,
  geoError,
}: FilterPanelProps) {
  const update = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <aside className="filter-panel" aria-label="Filters">
      <div className="panel-title">
        <SlidersHorizontal size={18} aria-hidden="true" />
        <span>Sort the field</span>
      </div>

      <label className="field">
        <span>Region</span>
        <select
          value={filters.region}
          onChange={(event) => update('region', event.target.value as Filters['region'])}
        >
          <option value="All">All Bay Area</option>
          {regionOrder.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Style</span>
        <select value={filters.style} onChange={(event) => update('style', event.target.value)}>
          <option value="All">All styles</option>
          {styles.map((style) => (
            <option key={style} value={style}>
              {style}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>City</span>
        <select value={filters.q} onChange={(event) => update('q', event.target.value)}>
          <option value="">Any city or name</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Sort</span>
        <select
          value={filters.sort}
          onChange={(event) => update('sort', event.target.value as SortMode)}
        >
          <option value="recommended">Recommended</option>
          <option value="distance">Distance</option>
          <option value="confidence">Source confidence</option>
          <option value="name">Name</option>
        </select>
      </label>

      <label className="field">
        <span>Distance radius</span>
        <input
          type="range"
          min="5"
          max="100"
          step="5"
          value={filters.radius}
          onChange={(event) => update('radius', Number(event.target.value))}
        />
        <small>{filters.radius} miles</small>
      </label>

      <div className="toggle-grid" aria-label="Quick filters">
        <ToggleButton
          active={filters.openBooks}
          onClick={() => update('openBooks', !filters.openBooks)}
        >
          Known open
        </ToggleButton>
        <ToggleButton
          active={filters.verifiedOnly}
          onClick={() => update('verifiedOnly', !filters.verifiedOnly)}
        >
          Source verified
        </ToggleButton>
        <ToggleButton
          active={filters.savedOnly}
          onClick={() => update('savedOnly', !filters.savedOnly)}
        >
          Saved only
        </ToggleButton>
        <ToggleButton
          active={filters.kind === 'artist'}
          onClick={() =>
            update('kind', filters.kind === 'artist' ? 'all' : ('artist' as TattooRecord['kind']))
          }
        >
          Artists
        </ToggleButton>
      </div>

      <div className="filter-actions">
        <button className="button button-light" type="button" onClick={onLocate}>
          <LocateFixed size={16} aria-hidden="true" />
          Use my location
        </button>
        <button className="icon-button" type="button" onClick={onReset} aria-label="Reset filters">
          <RotateCcw size={17} aria-hidden="true" />
        </button>
      </div>

      {geoError ? <p className="inline-error">{geoError}</p> : null}
      <p className="data-note">
        Permit-only records are discovery seeds. Confirm portfolio, rates, and booking status with
        the artist or studio before booking.
      </p>
    </aside>
  );
}

function ToggleButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={cn('toggle-button', active && 'is-active')}
      type="button"
      aria-pressed={active}
      onClick={onClick}
    >
      <Filter size={14} aria-hidden="true" />
      {children}
    </button>
  );
}
