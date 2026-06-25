import { Search } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BayRegion } from '../lib/schema';

type SearchPillProps = {
  styles: string[];
  initial?: {
    q?: string;
    where?: BayRegion | 'All';
    style?: string;
    openBooks?: boolean;
    mediaOnly?: boolean;
  };
  compact?: boolean;
};

const regions: Array<BayRegion | 'All'> = ['All', 'SF', 'East Bay', 'North Bay', 'Peninsula', 'South Bay'];

export function SearchPill({ styles, initial, compact = false }: SearchPillProps) {
  const navigate = useNavigate();
  const [q, setQ] = useState(initial?.q || '');
  const [where, setWhere] = useState<BayRegion | 'All'>(initial?.where || 'All');
  const [style, setStyle] = useState(initial?.style || 'All');
  const [availability, setAvailability] = useState(initial?.openBooks ? 'open' : initial?.mediaOnly ? 'media' : 'all');

  const topStyles = useMemo(() => ['All', ...styles.filter((item) => !['Studio', 'Custom tattooing'].includes(item)).slice(0, 28)], [styles]);

  useEffect(() => {
    setQ(initial?.q || '');
    setWhere(initial?.where || 'All');
    setStyle(initial?.style || 'All');
    setAvailability(initial?.openBooks ? 'open' : initial?.mediaOnly ? 'media' : 'all');
  }, [initial?.q, initial?.where, initial?.style, initial?.openBooks, initial?.mediaOnly]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (where !== 'All') params.set('where', where);
    if (style !== 'All') params.set('style', style);
    if (availability === 'open') params.set('openBooks', 'true');
    if (availability === 'media') params.set('mediaOnly', 'true');
    navigate(`/search?${params.toString()}`);
  }

  return (
    <form className={compact ? 'search-pill compact' : 'search-pill'} onSubmit={submit} aria-label="Search tattoo artists">
      <label>
        <span>Where</span>
        <select value={where} onChange={(event) => setWhere(event.target.value as BayRegion | 'All')}>
          {regions.map((region) => (
            <option key={region} value={region}>
              {region === 'All' ? 'All Bay Area' : region}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Style</span>
        <select value={style} onChange={(event) => setStyle(event.target.value)}>
          {topStyles.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Availability</span>
        <select value={availability} onChange={(event) => setAvailability(event.target.value)}>
          <option value="all">Any status</option>
          <option value="open">Open status sourced</option>
          <option value="media">Has portfolio</option>
        </select>
      </label>
      <label className="search-query">
        <span>Search</span>
        <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Fine line, Oakland, Ritual" />
      </label>
      <button className="search-submit" type="submit" aria-label="Search">
        <Search size={20} aria-hidden="true" />
      </button>
    </form>
  );
}
