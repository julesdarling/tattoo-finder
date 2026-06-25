import { describe, expect, it } from 'vitest';
import { distanceMiles, filterRecords, getAvailableStyles, sortRecords } from '../../src/lib/search';
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
    bookingStatus: 'unknown',
    website: 'https://blackserum.example',
    bookingUrl: 'https://blackserum.example',
    contactUrl: 'https://blackserum.example',
    instagram: 'https://www.instagram.com/blackserum/',
    instagramPosts: [],
    portfolioImages: [],
    portfolioItems: [
      {
        id: 'portfolio-1',
        source: 'officialWebsite',
        sourcePageUrl: 'https://blackserum.example/gallery',
        mediaType: 'image',
        displayMode: 'remoteImage',
        title: 'Fine line tattoo',
        alt: 'Fine line tattoo portfolio image',
        styleTags: ['Fine line'],
        collectedAt: '2026-06-25',
        rightsStatus: 'first_party_remote_reference',
        confidence: 0.8,
        mediaUrl: 'https://blackserum.example/image.jpg',
        thumbnailUrl: 'https://blackserum.example/image.jpg',
      },
    ],
    sourceRefs: [{ label: 'Official website', url: 'https://blackserum.example', type: 'official' }],
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
    bookingStatus: 'unknown',
    website: 'https://temple.example',
    bookingUrl: 'https://temple.example',
    contactUrl: 'https://temple.example',
    instagramPosts: [],
    portfolioImages: [],
    portfolioItems: [],
    sourceRefs: [{ label: 'OpenStreetMap', url: 'https://www.openstreetmap.org/node/1', type: 'osm' }],
    verifiedAt: '2026-06-25',
    confidence: 0.66,
  },
];

describe('filterRecords', () => {
  it('matches query, style, region, kind, and media filters together', () => {
    const result = filterRecords(records, {
      q: 'mara',
      where: 'SF',
      style: 'Fine line',
      radius: 50,
      origin: { lat: 37.7749, lng: -122.4194 },
      sort: 'distance',
      openBooks: false,
      mediaOnly: true,
      kind: 'artist',
      verifiedOnly: false,
      savedOnly: false,
      savedIds: [],
    });

    expect(result.map((record) => record.id)).toEqual(['sf-linework']);
  });

  it('sorts by distance from an origin when requested', () => {
    const result = sortRecords(records, 'distance', { lat: 37.7749, lng: -122.4194 });
    expect(result.map((record) => record.id)).toEqual(['sf-linework', 'oakland-traditional']);
    expect(distanceMiles({ lat: 37.7749, lng: -122.4194 }, { lat: 37.8044, lng: -122.2712 })).toBeGreaterThan(7);
  });

  it('builds a de-duplicated alphabetical style list', () => {
    expect(getAvailableStyles(records)).toEqual(['Blackwork', 'Fine line', 'Japanese', 'Traditional']);
  });
});
