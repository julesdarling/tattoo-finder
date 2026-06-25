import { Bookmark, ExternalLink, MapPin, X } from 'lucide-react';
import type { TattooRecord } from '../lib/schema';
import { bookingLabel, confidenceLabel, primaryActionLabel, sourceLabel } from '../lib/recordMeta';
import { InstagramEmbed } from './InstagramEmbed';

type DetailSheetProps = {
  record: TattooRecord | null;
  saved: boolean;
  onClose: () => void;
  onSave: (id: string) => void;
};

export function DetailSheet({ record, saved, onClose, onSave }: DetailSheetProps) {
  if (!record) return null;

  return (
    <aside className="detail-sheet" role="dialog" aria-modal="false" aria-label={record.name}>
      <div className="detail-header">
        <div>
          <p className="eyebrow">{record.kind}</p>
          <h2>{record.name}</h2>
          <p>
            {record.studioName} · {record.city}
          </p>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Close details">
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="detail-actions">
        <a className="button button-dark" href={record.bookingUrl} target="_blank" rel="noreferrer">
          {primaryActionLabel(record)}
          <ExternalLink size={16} aria-hidden="true" />
        </a>
        <button className="button button-light" type="button" onClick={() => onSave(record.id)}>
          <Bookmark size={16} aria-hidden="true" fill={saved ? 'currentColor' : 'none'} />
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>

      <dl className="detail-facts">
        <div>
          <dt>Verification</dt>
          <dd>{sourceLabel(record)}</dd>
        </div>
        <div>
          <dt>Confidence</dt>
          <dd>{confidenceLabel(record)}</dd>
        </div>
        <div>
          <dt>Booking</dt>
          <dd>{bookingLabel(record)}</dd>
        </div>
      </dl>

      <div className="detail-location">
        <MapPin size={17} aria-hidden="true" />
        <span>{record.address}</span>
      </div>

      <div className="detail-tags">
        {record.styles.map((style) => (
          <span key={style}>{style}</span>
        ))}
      </div>

      <InstagramEmbed postUrl={record.instagramPosts[0]} profileUrl={record.instagram} />

      <section className="source-list" aria-label="Source references">
        <p className="eyebrow">Source trail</p>
        {record.sourceRefs.map((source) => (
          <a key={`${source.type}-${source.url}`} href={source.url} target="_blank" rel="noreferrer">
            {source.label}
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        ))}
      </section>
    </aside>
  );
}
