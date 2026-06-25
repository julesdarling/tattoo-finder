import { Bookmark, ExternalLink, MapPin, ShieldCheck } from 'lucide-react';
import type { TattooRecord } from '../lib/schema';
import { confidenceLabel, primaryActionLabel, sourceLabel } from '../lib/recordMeta';
import { cn } from '../lib/cn';

type ResultCardProps = {
  record: TattooRecord;
  saved: boolean;
  selected: boolean;
  distance?: string | null;
  onOpen: () => void;
  onSave: () => void;
};

export function ResultCard({
  record,
  saved,
  selected,
  distance,
  onOpen,
  onSave,
}: ResultCardProps) {
  return (
    <article className={cn('result-card', selected && 'is-selected')}>
      <button
        className="record-open"
        type="button"
        aria-label={`Open ${record.name} details`}
        onClick={onOpen}
      >
        <PortfolioPreview record={record} />
        <span className="record-copy">
          <span className="record-topline">
            <span className="eyebrow">{record.kind}</span>
            <span className="badge">
              <ShieldCheck size={13} aria-hidden="true" />
              {sourceLabel(record)}
            </span>
          </span>
          <span className="record-name">{record.name}</span>
          <span className="record-meta">
            <MapPin size={14} aria-hidden="true" />
            {record.city}, {record.region}
            {distance ? <span>{distance}</span> : null}
          </span>
          <span className="record-tags">
            {record.styles.slice(0, 3).map((style) => (
              <span key={style}>{style}</span>
            ))}
          </span>
        </span>
      </button>

      <div className="record-actions">
        <span className="confidence">{confidenceLabel(record)}</span>
        <a
          className="micro-link"
          href={record.bookingUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
        >
          {primaryActionLabel(record)}
          <ExternalLink size={13} aria-hidden="true" />
        </a>
        <button className="save-button" type="button" onClick={onSave}>
          <Bookmark size={15} aria-hidden="true" fill={saved ? 'currentColor' : 'none'} />
          {saved ? `Saved ${record.name}` : `Save ${record.name}`}
        </button>
      </div>
    </article>
  );
}

function PortfolioPreview({ record }: { record: TattooRecord }) {
  return (
    <span className="portfolio-preview" aria-hidden="true">
      {record.portfolioImages.slice(0, 3).map((image, index) => (
        <span
          key={image.id}
          className={cn('portfolio-tile', `tone-${image.tone}`)}
          style={{ '--tile-index': index } as React.CSSProperties}
        />
      ))}
    </span>
  );
}
