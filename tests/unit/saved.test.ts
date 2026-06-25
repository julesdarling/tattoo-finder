import { describe, expect, it, beforeEach } from 'vitest';
import { readSavedIds, toggleSavedId } from '../../src/lib/saved';

describe('saved record persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('stores saved ids without duplicates', () => {
    expect(toggleSavedId('sf-linework')).toEqual(['sf-linework']);
    expect(toggleSavedId('sf-linework')).toEqual([]);
    expect(toggleSavedId('oakland-traditional')).toEqual(['oakland-traditional']);
    expect(toggleSavedId('oakland-traditional')).toEqual([]);
  });

  it('recovers from malformed localStorage content', () => {
    window.localStorage.setItem('tattoo-finder.saved', '{"bad":true}');

    expect(readSavedIds()).toEqual([]);
  });
});
