import { describe, expect, it } from 'vitest';
import { filterRecords, getAvailableStyles, sortRecords } from '../../src/lib/search';
import type { TattooRecord } from '../../src/lib/schema';

const records: TattooRecord[] = [
  {
    id: 'sf-linework',
    kind: 'artist',
    name: 'Mara Quill',
    studioName: 'Black Serum Tattoo',
    city: 'San Francisco',
    region: 'SF',
    address: '310 Valencia St, San Francisco, CA',
    lat: 37.7687,
    lng: -122.4212,
    styles: ['Fine line', 'Blackwork'],
    bookingStatus: 'open',
    website: 'https://blackserum.com',
    bookingUrl: 'https://blackserum.com',
    contactUrl: 'https://blackserum.com',
    instagram: 'https://www.instagram.com/blackserum',
    instagramPosts: [],
    portfolioImages: [],
    sourceRefs: [{ label: 'Official website', url: 'https://blackserum.com', type: 'official' }],
    verifiedAt: '2026-06-25',
    confidence: 0.91,
  },
  {
    id: 'oakland-traditional',
    kind: 'studio',
    name: 'Temple Tattoo',
    studioName: 'Temple Tattoo',
    city: 'Oakland',
    region: 'East Bay',
    address: 'Oakland, CA',
    lat: 37.8044,
    lng: -122.2712,
    styles: ['Traditional', 'Japanese'],
    bookingStatus: 'waitlist',
    website: 'https://templetattoo.com',
    bookingUrl: 'https://templetattoo.com',
    contactUrl: 'https://templetattoo.com',
    instagram: 'https://www.instagram.com/templetattoo',
    instagramPosts: [],
    portfolioImages: [],
    sourceRefs: [{ label: 'Official website', url: 'https://templetattoo.com', type: 'official' }],
    verifiedAt: '2026-06-25',
    confidence: 0.86,
  },
  {
    id: 'santa-rosa-geometric',
    kind: 'artist',
    name: 'Iris Vale',
    studioName: 'Glass Beetle Studio',
    city: 'Santa Rosa',
    region: 'North Bay',
    address: 'Santa Rosa, CA',
    lat: 38.4404,
    lng: -122.7141,
    styles: ['Geometric', 'Fine line'],
    bookingStatus: 'closed',
    website: 'https://example.com/glass-beetle',
    bookingUrl: 'https://example.com/glass-beetle',
    contactUrl: 'https://example.com/glass-beetle',
    instagram: 'https://www.instagram.com/glassbeetle',
    instagramPosts: [],
    portfolioImages: [],
    sourceRefs: [{ label: 'Studio website', url: 'https://example.com/glass-beetle', type: 'website' }],
    verifiedAt: '2026-06-25',
    confidence: 0.71,
  },
];

describe('filterRecords', () => {
  it('matches query, style, region, kind, and open booking filters together', () => {
    const result = filterRecords(records, {
      q: 'mara',
      region: 'SF',
      style: 'Fine line',
      radius: 50,
      origin: { lat: 37.7749, lng: -122.4194 },
      sort: 'distance',
      openBooks: true,
      kind: 'artist',
      verifiedOnly: false,
      savedOnly: false,
      savedIds: [],
    });

    expect(result.map((record) => record.id)).toEqual(['sf-linework']);
  });

  it('sorts by distance from an origin when requested', () => {
    const result = sortRecords(records, 'distance', { lat: 37.7749, lng: -122.4194 });

    expect(result.map((record) => record.id)).toEqual([
      'sf-linework',
      'oakland-traditional',
      'santa-rosa-geometric',
    ]);
  });

  it('builds a de-duplicated alphabetical style list', () => {
    expect(getAvailableStyles(records)).toEqual([
      'Blackwork',
      'Fine line',
      'Geometric',
      'Japanese',
      'Traditional',
    ]);
  });
});
