import { Bookmark, Heart, MapPin, ShieldCheck } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { TattooRecord } from '../lib/schema';
import { bookingLabel, portfolioLabel, sourceLabel } from '../lib/recordMeta';
import { cn } from '../lib/cn';
import { MediaFrame } from './MediaFrame';

type ListingCardProps = {
  record: TattooRecord;
  saved: boolean;
  onSave: (id: string) => void;
  onOpen: (record: TattooRecord) => void;
  index?: number;
  compact?: boolean;
};

export function ListingCard({ record, saved, onSave, onOpen, index = 0, compact = false }: ListingCardProps) {
  const galleryCount = Math.max(6, Math.min(9, record.portfolioItems.length));

  return (
    <article className={cn('listing-card', compact && 'compact')} style={{ '--card-index': index } as CSSProperties}>
      <button className="card-open" type="button" onClick={() => onOpen(record)}>
        <MediaFrame record={record} interactive={false} />
        <span className="gallery-dots" aria-hidden="true">
          {Array.from({ length: Math.min(galleryCount, 6) }, (_, dotIndex) => (
            <span key={dotIndex} />
          ))}
        </span>
      </button>
      <button
        className={cn('save-heart', saved && 'is-saved')}
        type="button"
        onClick={() => onSave(record.id)}
        aria-label={saved ? `Remove ${record.name} from saved` : `Save ${record.name}`}
      >
        <Heart size={18} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
      </button>
      <button className="listing-copy" type="button" onClick={() => onOpen(record)}>
        <span className="badge-row">
          <span className="source-badge">
            <ShieldCheck size={14} aria-hidden="true" />
            {sourceLabel(record)}
          </span>
          <span>{portfolioLabel(record)}</span>
        </span>
        <strong>{record.name}</strong>
        <span className="listing-meta">
          <MapPin size={14} aria-hidden="true" />
          {record.city}, {record.region}
        </span>
        <span className="style-row">{record.styles.slice(0, 3).join(' · ')}</span>
        <span className="booking-row">
          <Bookmark size={14} aria-hidden="true" />
          {bookingLabel(record)}
        </span>
      </button>
    </article>
  );
}
