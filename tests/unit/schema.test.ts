import { describe, expect, it } from 'vitest';
import { TattooRecordSchema } from '../../src/lib/schema';

const validRecord = {
  id: 'sf-black-serum-studio',
  kind: 'studio',
  name: 'Black Serum Tattoo',
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
  instagramPosts: ['https://www.instagram.com/p/official-post/'],
  portfolioImages: [
    {
      id: 'flash-1',
      alt: 'Fine line tattoo flash preview',
      tone: 'linework',
    },
  ],
  sourceRefs: [
    {
      label: 'Official website',
      url: 'https://blackserum.com',
      type: 'official',
    },
  ],
  verifiedAt: '2026-06-25',
  confidence: 0.91,
};

describe('TattooRecordSchema', () => {
  it('accepts sourced Bay Area records with official Instagram links', () => {
    const parsed = TattooRecordSchema.parse(validRecord);

    expect(parsed.name).toBe('Black Serum Tattoo');
    expect(parsed.instagramPosts[0]).toContain('instagram.com/p/');
  });

  it('rejects hosted Instagram media copies', () => {
    const result = TattooRecordSchema.safeParse({
      ...validRecord,
      portfolioImages: [
        {
          id: 'copied-ig',
          alt: 'Copied Instagram image',
          url: 'https://cdninstagram.com/copied-media.jpg',
          tone: 'linework',
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('requires Instagram profile and post URLs to use official link shapes', () => {
    const profileResult = TattooRecordSchema.safeParse({
      ...validRecord,
      instagram: 'https://www.instagram.com/p/not-a-profile/',
    });
    const postResult = TattooRecordSchema.safeParse({
      ...validRecord,
      instagramPosts: ['https://www.instagram.com/blackserum/'],
    });

    expect(profileResult.success).toBe(false);
    expect(postResult.success).toBe(false);
  });

  it('requires source references and bounded confidence', () => {
    const result = TattooRecordSchema.safeParse({
      ...validRecord,
      sourceRefs: [],
      confidence: 1.4,
    });

    expect(result.success).toBe(false);
  });

  it('accepts county permit records as provenance', () => {
    const parsed = TattooRecordSchema.parse({
      ...validRecord,
      id: 'santa-clara-fa0303495',
      name: 'Pura Tinta Tattoo Studio',
      studioName: 'Pura Tinta Tattoo Studio',
      city: 'San Jose',
      region: 'South Bay',
      sourceRefs: [
        {
          label: 'Santa Clara County permitted body art facilities',
          url: 'https://data.sccgov.org/Health/County-of-Santa-Clara-Permitted-Body-Art-Facilitie/mqx2-w62f',
          type: 'permit',
        },
      ],
    });

    expect(parsed.sourceRefs[0].type).toBe('permit');
  });

  it('accepts eastern South Bay permit coordinates', () => {
    const parsed = TattooRecordSchema.parse({
      ...validRecord,
      id: 'santa-clara-gilroy-edge',
      city: 'Gilroy',
      region: 'South Bay',
      lat: 37.0058,
      lng: -121.12,
    });

    expect(parsed.lng).toBe(-121.12);
  });
});
