import { ExternalLink, Instagram } from 'lucide-react';
import type { TattooRecord } from '../lib/schema';

type MediaFrameProps = {
  record: TattooRecord;
  index?: number;
  large?: boolean;
  interactive?: boolean;
};

export function MediaFrame({ record, index = 0, large = false, interactive = true }: MediaFrameProps) {
  const item = record.portfolioItems[index % Math.max(record.portfolioItems.length, 1)];
  const fallback = record.portfolioImages[index % Math.max(record.portfolioImages.length, 1)];

  if (item?.displayMode === 'remoteImage' && item.thumbnailUrl) {
    return (
      <figure className={large ? 'media-frame large' : 'media-frame'}>
        <img src={item.thumbnailUrl} alt={item.alt} loading="lazy" />
        <figcaption>{item.rightsStatus.replace(/_/g, ' ')}</figcaption>
      </figure>
    );
  }

  if (item?.source === 'instagram') {
    const className = large ? 'media-frame instagram large' : 'media-frame instagram';
    const label = item.mediaType === 'instagramPost' ? 'Instagram post' : 'Instagram profile';
    const contents = (
      <>
        <Instagram size={24} aria-hidden="true" />
        <span>{label}</span>
        <ExternalLink size={16} aria-hidden="true" />
      </>
    );
    if (!interactive) {
      return (
        <div className={className} aria-label={label}>
          {contents}
        </div>
      );
    }

    return (
      <a className={className} href={item.sourcePageUrl} target="_blank" rel="noreferrer">
        {contents}
      </a>
    );
  }

  return (
    <div className={large ? `media-frame fallback large tone-${fallback?.tone || 'flash'}` : `media-frame fallback tone-${fallback?.tone || 'flash'}`}>
      <span>Fallback preview</span>
    </div>
  );
}
