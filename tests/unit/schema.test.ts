import { describe, expect, it } from 'vitest';
import { TattooDatasetSchema } from '../../src/lib/schema';
import { tattooRecords } from '../../src/data';

describe('TattooDatasetSchema', () => {
  it('validates the app dataset and preserves portfolio safety', () => {
    const parsed = TattooDatasetSchema.parse(tattooRecords);
    expect(parsed.length).toBeGreaterThanOrEqual(471);
    expect(parsed.some((record) => record.portfolioItems.length > 0)).toBe(true);
    expect(JSON.stringify(parsed)).not.toMatch(/cdninstagram\.com|fbcdn\.net/);
  });
});
