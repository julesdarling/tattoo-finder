import { describe, expect, it } from 'vitest';
import { readSavedIds, toggleSavedId, writeSavedIds } from '../../src/lib/saved';

describe('saved records storage', () => {
  it('dedupes and toggles saved record ids', () => {
    const storage = window.localStorage;
    storage.clear();
    expect(writeSavedIds(['a', 'a', 'b'], storage)).toEqual(['a', 'b']);
    expect(readSavedIds(storage)).toEqual(['a', 'b']);
    expect(toggleSavedId('a', storage)).toEqual(['b']);
    expect(toggleSavedId('c', storage)).toEqual(['b', 'c']);
  });
});
