import { SlidersHorizontal, X } from 'lucide-react';
import type { Filters, SortMode } from '../lib/search';
import type { BayRegion, TattooRecord } from '../lib/schema';
import { cn } from '../lib/cn';

type FilterPanelProps = {
  filters: Filters;
  styles: string[];
  onChange: (next: Partial<Filters>) => void;
  onReset: () => void;
  open?: boolean;
  onClose?: () => void;
};

const regions: Array<BayRegion | 'All'> = ['All', 'SF', 'East Bay', 'North Bay', 'Peninsula', 'South Bay'];
const sorts: SortMode[] = ['recommended', 'portfolio', 'distance', 'confidence', 'name'];
const kinds: Array<TattooRecord['kind'] | 'all'> = ['all', 'artist', 'studio'];

export function FilterPanel({ filters, styles, onChange, onReset, open, onClose }: FilterPanelProps) {
  return (
    <aside className={cn('filter-panel', open && 'is-open')} aria-label="Filters">
      <div className="panel-title">
        <span>
          <SlidersHorizontal size={18} aria-hidden="true" />
          Filters
        </span>
        {onClose ? (
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close filters">
            <X size={18} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <label className="field">
        <span>Region</span>
        <select value={filters.where} onChange={(event) => onChange({ where: event.target.value as BayRegion | 'All' })}>
          {regions.map((region) => (
            <option key={region} value={region}>
              {region === 'All' ? 'All Bay Area' : region}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Style</span>
        <select value={filters.style} onChange={(event) => onChange({ style: event.target.value })}>
          {['All', ...styles].map((style) => (
            <option key={style}>{style}</option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Sort</span>
        <select value={filters.sort} onChange={(event) => onChange({ sort: event.target.value as SortMode })}>
          {sorts.map((sort) => (
            <option key={sort} value={sort}>
              {sort === 'recommended' ? 'Recommended' : sort[0].toUpperCase() + sort.slice(1)}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Type</span>
        <select value={filters.kind} onChange={(event) => onChange({ kind: event.target.value as TattooRecord['kind'] | 'all' })}>
          {kinds.map((kind) => (
            <option key={kind} value={kind}>
              {kind === 'all' ? 'Artists and studios' : kind[0].toUpperCase() + kind.slice(1)}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Distance radius</span>
        <input type="range" min="5" max="90" step="5" value={filters.radius} onChange={(event) => onChange({ radius: Number(event.target.value) })} />
        <small>{filters.radius} miles</small>
      </label>

      <div className="toggle-grid">
        <button className={cn(filters.openBooks && 'is-active')} type="button" aria-pressed={filters.openBooks} onClick={() => onChange({ openBooks: !filters.openBooks })}>
          Open status
        </button>
        <button className={cn(filters.mediaOnly && 'is-active')} type="button" aria-pressed={filters.mediaOnly} onClick={() => onChange({ mediaOnly: !filters.mediaOnly })}>
          Has portfolio
        </button>
        <button className={cn(filters.verifiedOnly && 'is-active')} type="button" aria-pressed={filters.verifiedOnly} onClick={() => onChange({ verifiedOnly: !filters.verifiedOnly })}>
          Source verified
        </button>
        <button className={cn(filters.savedOnly && 'is-active')} type="button" aria-pressed={filters.savedOnly} onClick={() => onChange({ savedOnly: !filters.savedOnly })}>
          Saved only
        </button>
      </div>

      <button className="reset-button" type="button" onClick={onReset}>
        Reset filters
      </button>
    </aside>
  );
}
