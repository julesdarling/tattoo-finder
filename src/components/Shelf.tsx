import { ArrowRight } from 'lucide-react';
import type { TattooRecord } from '../lib/schema';
import { ListingCard } from './ListingCard';

type ShelfProps = {
  title: string;
  subtitle?: string;
  records: TattooRecord[];
  savedIds: string[];
  onSave: (id: string) => void;
  onOpen: (record: TattooRecord) => void;
  onViewAll: () => void;
};

export function Shelf({ title, subtitle, records, savedIds, onSave, onOpen, onViewAll }: ShelfProps) {
  return (
    <section className="shelf" aria-label={title}>
      <div className="shelf-head">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <button className="text-button" type="button" onClick={onViewAll}>
          View all <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="shelf-track">
        {records.map((record, index) => (
          <ListingCard
            key={record.id}
            record={record}
            saved={savedIds.includes(record.id)}
            onSave={onSave}
            onOpen={onOpen}
            index={index}
            compact
          />
        ))}
      </div>
    </section>
  );
}
