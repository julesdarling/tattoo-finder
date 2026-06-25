import { Clock, Heart, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import { DetailSheet } from '../components/DetailSheet';
import { SearchPill } from '../components/SearchPill';
import { Shelf } from '../components/Shelf';
import { tattooRecords, dataMetadata } from '../data';
import { filterRecords, getAvailableStyles, type Filters } from '../lib/search';
import { readSavedIds, toggleSavedId } from '../lib/saved';
import type { TattooRecord } from '../lib/schema';

export function HomePage() {
  const navigate = useNavigate();
  const styles = useMemo(() => getAvailableStyles(tattooRecords), []);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<TattooRecord | null>(null);
  const [lastSearch, setLastSearch] = useState<string | null>(null);

  useEffect(() => {
    setSavedIds(readSavedIds());
    setLastSearch(window.localStorage.getItem('tattoo-finder.last-search'));
  }, []);

  function save(id: string) {
    setSavedIds(toggleSavedId(id));
  }

  const shelfFilters: Array<{ title: string; subtitle: string; params: Partial<Filters> }> = [
    { title: 'Fine line near SF', subtitle: 'Needle-thin work, city first', params: { where: 'SF', style: 'Fine line' } },
    { title: 'Blackwork in Oakland', subtitle: 'East Bay records with bold contrast', params: { where: 'East Bay', style: 'Blackwork' } },
    { title: 'Portfolio-rich picks', subtitle: 'Records with real source-linked portfolio refs', params: { mediaOnly: true, sort: 'portfolio' } },
    { title: 'East Bay studios', subtitle: 'Studios and shops across Oakland, Berkeley, and nearby cities', params: { where: 'East Bay', kind: 'studio' } },
    { title: 'North Bay finds', subtitle: 'Santa Rosa, Napa, and nearby studios', params: { where: 'North Bay' } },
    { title: 'Artist records', subtitle: 'Permit and source records for individual practitioners', params: { kind: 'artist' } },
  ];

  function recordsFor(params: Partial<Filters>) {
    return filterRecords(tattooRecords, {
      q: '',
      where: params.where || 'All',
      style: params.style || 'All',
      radius: 50,
      origin: null,
      sort: params.sort || 'recommended',
      openBooks: false,
      mediaOnly: Boolean(params.mediaOnly),
      kind: params.kind || 'all',
      verifiedOnly: false,
      savedOnly: false,
      savedIds,
    }).slice(0, 12);
  }

  function viewAll(params: Partial<Filters>) {
    const search = new URLSearchParams();
    if (params.where && params.where !== 'All') search.set('where', params.where);
    if (params.style && params.style !== 'All') search.set('style', params.style);
    if (params.kind && params.kind !== 'all') search.set('kind', params.kind);
    if (params.mediaOnly) search.set('mediaOnly', 'true');
    if (params.sort) search.set('sort', params.sort);
    navigate(`/search?${search.toString()}`);
  }

  return (
    <main className="app-shell home-shell">
      <header className="home-nav">
        <BrandMark />
        <nav className="mode-tabs" aria-label="Browse modes">
          <button className="is-active" type="button">Artists</button>
          <button type="button" onClick={() => navigate('/search?kind=studio')}>Studios</button>
          <button type="button" onClick={() => navigate('/search?style=Flash')}>Flash</button>
        </nav>
        <button className="saved-link" type="button" onClick={() => navigate('/search?savedOnly=true')}>
          <Heart size={17} fill={savedIds.length ? 'currentColor' : 'none'} aria-hidden="true" />
          {savedIds.length} saved
        </button>
      </header>

      <section className="search-hero" aria-label="Find tattoo artists">
        <div className="hero-copy">
          <p className="eyebrow">San Francisco Bay Area</p>
          <h1>Find tattoo work nearby</h1>
        </div>
        <SearchPill styles={styles} />
      </section>

      <button className="continue-strip" type="button" onClick={() => navigate(lastSearch || '/search')}>
        <Clock size={20} aria-hidden="true" />
        <span>
          <strong>Continue searching Bay Area artists</strong>
          <small>{dataMetadata.totalRecords} records · {dataMetadata.portfolioEnrichment?.totalPortfolioItems || 0} portfolio refs · verify before booking</small>
        </span>
        <SlidersHorizontal size={18} aria-hidden="true" />
      </button>

      <div className="shelves">
        {shelfFilters.map((shelf) => (
          <Shelf
            key={shelf.title}
            title={shelf.title}
            subtitle={shelf.subtitle}
            records={recordsFor(shelf.params)}
            savedIds={savedIds}
            onSave={save}
            onOpen={setSelected}
            onViewAll={() => viewAll(shelf.params)}
          />
        ))}
      </div>

      <footer className="site-footer">
        <span>Data from public discovery sources. Portfolio references stay link-based.</span>
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OSM attribution</a>
      </footer>

      {selected ? <DetailSheet record={selected} saved={savedIds.includes(selected.id)} onClose={() => setSelected(null)} onSave={save} /> : null}
    </main>
  );
}
