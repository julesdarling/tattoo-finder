import { describe, expect, it } from 'vitest';
import { hasPrototypeArtwork, mergePrototypeArtwork, type PrototypeArtworkPayload } from '../../src/lib/prototypeArtwork';
import type { TattooRecord } from '../../src/lib/schema';

const record: TattooRecord = {
  id: 'official-record',
  kind: 'studio',
  name: 'Official Record',
  studioName: 'Official Record',
  city: 'Oakland',
  region: 'East Bay',
  address: 'Oakland, CA',
  lat: 37.8044,
  lng: -122.2712,
  styles: ['Blackwork'],
  bookingStatus: 'unknown',
  website: 'https://example.com',
  bookingUrl: 'https://example.com',
  contactUrl: 'https://example.com',
  instagramPosts: [],
  portfolioImages: [],
  portfolioItems: [],
  sourceRefs: [{ label: 'Official website', url: 'https://example.com', type: 'official' }],
  verifiedAt: '2026-06-25',
  confidence: 0.8,
};

const payload: PrototypeArtworkPayload = {
  generatedAt: '2026-06-25',
  mode: 'local-prototype',
  records: {
    'official-record': [
      {
        id: 'artwork-1',
        recordId: 'official-record',
        imageUrl: 'https://example.com/artwork.jpg',
        sourcePageUrl: 'https://example.com/gallery',
        title: 'Artwork',
        alt: 'Tattoo artwork',
        permissionStatus: 'needs_permission',
        collectedAt: '2026-06-25',
      },
    ],
  },
};

describe('prototype artwork helpers', () => {
  it('merges local prototype artwork without changing base record fields', () => {
    const merged = mergePrototypeArtwork([record], payload);

    expect(merged[0].name).toBe('Official Record');
    expect(merged[0].prototypeArtworkItems).toHaveLength(1);
    expect(hasPrototypeArtwork(merged[0])).toBe(true);
  });
});
