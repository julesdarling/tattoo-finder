import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ListingCard } from '../../src/components/ListingCard';
import type { TattooRecord } from '../../src/lib/schema';

const record: TattooRecord = {
  id: 'fallback-record',
  kind: 'studio',
  name: 'Fallback Studio',
  studioName: 'Fallback Studio',
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
  portfolioImages: [{ id: 'fallback', alt: 'Fallback portfolio preview', tone: 'flash' }],
  portfolioItems: [],
  sourceRefs: [{ label: 'OpenStreetMap', url: 'https://www.openstreetmap.org/node/1', type: 'osm' }],
  verifiedAt: '2026-06-25',
  confidence: 0.66,
};

describe('ListingCard', () => {
  it('labels fallback media and toggles save', async () => {
    const onSave = vi.fn();
    const onOpen = vi.fn();
    render(<ListingCard record={record} saved={false} onSave={onSave} onOpen={onOpen} />);

    expect(screen.getAllByText('Fallback preview').length).toBeGreaterThan(0);
    await userEvent.click(screen.getByLabelText('Save Fallback Studio'));
    expect(onSave).toHaveBeenCalledWith('fallback-record');
  });
});
