import { describe, expect, it } from 'vitest';
import { filtersFromParams, paramsFromFilters, viewFromParams } from '../../src/lib/urlState';

describe('url state', () => {
  it('uses the region origin when coordinates are omitted', () => {
    const filters = filtersFromParams(new URLSearchParams('where=SF'), []);
    expect(filters.origin).toEqual({ lat: 37.7749, lng: -122.4194 });
  });

  it('round trips meaningful filter params', () => {
    const filters = filtersFromParams(new URLSearchParams('q=oakland&where=East+Bay&style=Blackwork&mediaOnly=true&view=map'), ['saved-1']);
    expect(filters.where).toBe('East Bay');
    expect(filters.mediaOnly).toBe(true);
    expect(filters.savedIds).toEqual(['saved-1']);
    expect(viewFromParams(new URLSearchParams('view=map'))).toBe('map');

    const params = paramsFromFilters({ ...filters, savedOnly: true }, 'map');
    expect(params.get('q')).toBe('oakland');
    expect(params.get('savedOnly')).toBe('true');
    expect(params.get('view')).toBe('map');
  });
});
