import { ExternalLink, Instagram } from 'lucide-react';
import { useState } from 'react';
import type { TattooRecordWithPrototypeArt } from '../lib/prototypeArtwork';

type MediaFrameProps = {
  record: TattooRecordWithPrototypeArt;
  index?: number;
  large?: boolean;
  interactive?: boolean;
  eager?: boolean;
};

export function MediaFrame({ record, index = 0, large = false, interactive = true, eager = false }: MediaFrameProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const prototypeItem = record.prototypeArtworkItems?.[index];
  const item = record.portfolioItems[index];
  const fallbackIndex = Math.max(index - record.portfolioItems.length, 0);
  const fallback = record.portfolioImages[fallbackIndex % Math.max(record.portfolioImages.length, 1)];
  const fallbackTone = fallback?.tone || fallbackTones[fallbackIndex % fallbackTones.length];
  const className = [
    'media-frame',
    'fallback',
    large ? 'large' : '',
    `tone-${fallbackTone}`,
    `fallback-${fallbackIndex % fallbackTones.length}`,
  ]
    .filter(Boolean)
    .join(' ');

  if (prototypeItem && !imageFailed) {
    return (
      <figure className={large ? 'media-frame large prototype-artwork' : 'media-frame prototype-artwork'}>
        <img src={prototypeItem.imageUrl} alt={prototypeItem.alt} loading={eager ? 'eager' : 'lazy'} onError={() => setImageFailed(true)} />
        <figcaption>Needs permission</figcaption>
      </figure>
    );
  }

  if (item?.displayMode === 'remoteImage' && item.thumbnailUrl && !imageFailed) {
    return (
      <figure className={large ? 'media-frame large' : 'media-frame'}>
        <img src={item.thumbnailUrl} alt={item.alt} loading={eager ? 'eager' : 'lazy'} onError={() => setImageFailed(true)} />
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
    <div className={className} role="img" aria-label={fallback?.alt || `${record.name} fallback visual ${fallbackIndex + 1}`}>
      <span>Fallback preview</span>
    </div>
  );
}

const fallbackTones = ['flash', 'linework', 'blackwork', 'lettering', 'studio', 'color'];
