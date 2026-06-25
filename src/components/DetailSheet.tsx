import { ExternalLink, Heart, Instagram, MapPin, ShieldCheck, X } from 'lucide-react';
import type { TattooRecordWithPrototypeArt } from '../lib/prototypeArtwork';
import { bookingLabel, confidenceLabel, primaryActionLabel, sourceLabel } from '../lib/recordMeta';
import { MediaFrame } from './MediaFrame';
import { cn } from '../lib/cn';

type DetailSheetProps = {
  record: TattooRecordWithPrototypeArt;
  saved: boolean;
  onClose: () => void;
  onSave: (id: string) => void;
};

export function DetailSheet({ record, saved, onClose, onSave }: DetailSheetProps) {
  const instagramUrl = record.instagram || record.portfolioItems.find((item) => item.source === 'instagram')?.sourcePageUrl;
  const prototypeArtworkCount = record.prototypeArtworkItems?.length || 0;
  const galleryFrameCount = Math.max(6, Math.min(12, prototypeArtworkCount || record.portfolioItems.length));

  return (
    <aside className="detail-sheet" role="dialog" aria-modal="true" aria-label={`${record.name} details`}>
      <div className="detail-head">
        <div>
          <span className="eyebrow">{record.kind} · {bookingLabel(record)}</span>
          <h2>{record.name}</h2>
          <p>{record.studioName} in {record.city}, {record.region}</p>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Close details">
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="detail-gallery">
        {Array.from({ length: galleryFrameCount }, (_, index) => (
          <MediaFrame key={index} record={record} index={index} large={index === 0} eager />
        ))}
      </div>

      <div className="detail-actions">
        <a className="button primary" href={record.bookingUrl} target="_blank" rel="noreferrer">
          {primaryActionLabel(record)} <ExternalLink size={16} aria-hidden="true" />
        </a>
        <button className={cn('button secondary', saved && 'is-saved')} type="button" onClick={() => onSave(record.id)}>
          <Heart size={16} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
          {saved ? 'Saved' : 'Save'}
        </button>
        {instagramUrl ? (
          <a className="button secondary" href={instagramUrl} target="_blank" rel="noreferrer">
            <Instagram size={16} aria-hidden="true" />
            Instagram
          </a>
        ) : null}
      </div>

      <dl className="fact-grid">
        <div>
          <dt>Portfolio</dt>
          <dd>{prototypeArtworkCount ? `${prototypeArtworkCount} prototype images` : record.portfolioItems.length ? `${record.portfolioItems.length} refs` : 'Fallback only'}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{sourceLabel(record)}</dd>
        </div>
        <div>
          <dt>Confidence</dt>
          <dd>{confidenceLabel(record)}</dd>
        </div>
      </dl>

      <div className="detail-tags">
        {record.styles.map((style) => (
          <span key={style}>{style}</span>
        ))}
      </div>

      <p className="verify-note">
        <ShieldCheck size={16} aria-hidden="true" />
        Verify before booking: permit and portfolio records are discovery references. Confirm portfolio, rates, and booking status with the artist or studio.
      </p>

      <div className="source-list">
        {record.sourceRefs.map((source) => (
          <a key={`${source.label}-${source.url}`} href={source.url} target="_blank" rel="noreferrer">
            {source.label} <ExternalLink size={14} aria-hidden="true" />
          </a>
        ))}
      </div>

      <p className="detail-location">
        <MapPin size={16} aria-hidden="true" />
        {record.address}
      </p>
    </aside>
  );
}
