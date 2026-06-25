import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DetailSheet } from '../../src/components/DetailSheet';
import type { TattooRecord } from '../../src/lib/schema';

const sparseRecord: TattooRecord = {
  id: 'sparse-gallery',
  kind: 'studio',
  name: 'Sparse Gallery',
  studioName: 'Sparse Gallery',
  city: 'San Francisco',
  region: 'SF',
  address: 'San Francisco, CA',
  lat: 37.7749,
  lng: -122.4194,
  styles: ['Fine line'],
  bookingStatus: 'unknown',
  website: 'https://example.com',
  bookingUrl: 'https://example.com',
  contactUrl: 'https://example.com',
  instagramPosts: [],
  portfolioImages: [
    { id: 'fallback-1', alt: 'Sparse Gallery fallback preview one', tone: 'flash' },
    { id: 'fallback-2', alt: 'Sparse Gallery fallback preview two', tone: 'linework' },
  ],
  portfolioItems: [
    {
      id: 'instagram-profile',
      source: 'instagram',
      sourcePageUrl: 'https://www.instagram.com/sparsegallery/',
      mediaType: 'instagramProfile',
      displayMode: 'externalLink',
      title: 'Sparse Gallery Instagram',
      alt: 'Sparse Gallery Instagram profile',
      styleTags: ['Fine line'],
      collectedAt: '2026-06-25',
      rightsStatus: 'official_profile_link_only',
      confidence: 0.7,
    },
  ],
  sourceRefs: [{ label: 'Official website', url: 'https://example.com', type: 'official' }],
  verifiedAt: '2026-06-25',
  confidence: 0.8,
};

describe('DetailSheet', () => {
  it('renders a six-frame gallery for sparse portfolio records', () => {
    const { container } = render(<DetailSheet record={sparseRecord} saved={false} onClose={vi.fn()} onSave={vi.fn()} />);

    expect(container.querySelectorAll('.detail-gallery .media-frame')).toHaveLength(6);
    expect(screen.getByRole('link', { name: /instagram profile/i })).toBeInTheDocument();
    expect(screen.getAllByText('Fallback preview')).toHaveLength(5);
  });
});
