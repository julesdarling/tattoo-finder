import { useEffect, useMemo, useState } from 'react';
import type { TattooRecord } from '../lib/schema';
import { distanceMiles } from '../lib/search';
import { displayDistance } from '../lib/recordMeta';
import { ResultCard } from './ResultCard';

const PAGE_SIZE = 80;

type ResultsListProps = {
  records: TattooRecord[];
  selectedId: string | null;
  savedIds: string[];
  origin: { lat: number; lng: number } | null;
  onOpen: (record: TattooRecord) => void;
  onSave: (id: string) => void;
};

export function ResultsList({
  records,
  selectedId,
  savedIds,
  origin,
  onOpen,
  onSave,
}: ResultsListProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visibleRecords = useMemo(() => records.slice(0, visibleCount), [records, visibleCount]);
  const hiddenCount = Math.max(records.length - visibleRecords.length, 0);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [records]);

  if (!records.length) {
    return (
      <section className="empty-state">
        <p className="eyebrow">No matching records</p>
        <h2>Widen the map or loosen a filter.</h2>
        <p>
          Try all styles, turn off saved-only, or search by a nearby city. Permit records may not
          include portfolio detail yet.
        </p>
      </section>
    );
  }

  return (
    <div className="results-list-wrap">
      <div className="results-list" aria-label="Tattoo records">
        {visibleRecords.map((record) => (
          <ResultCard
            key={record.id}
            record={record}
            saved={savedIds.includes(record.id)}
            selected={selectedId === record.id}
            distance={displayDistance(record, origin, distanceMiles)}
            onOpen={() => onOpen(record)}
            onSave={() => onSave(record.id)}
          />
        ))}
      </div>
      {hiddenCount ? (
        <button
          className="load-more"
          type="button"
          onClick={() => setVisibleCount((count) => Math.min(count + PAGE_SIZE, records.length))}
        >
          Load {Math.min(PAGE_SIZE, hiddenCount)} more
          <span>
            Showing {visibleRecords.length} of {records.length}
          </span>
        </button>
      ) : null}
    </div>
  );
}
