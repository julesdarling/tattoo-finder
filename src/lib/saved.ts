const STORAGE_KEY = 'tattoo-finder.saved';

export function readSavedIds(storage: Storage = window.localStorage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

export function writeSavedIds(ids: string[], storage: Storage = window.localStorage) {
  const deduped = Array.from(new Set(ids));
  storage.setItem(STORAGE_KEY, JSON.stringify(deduped));
  return deduped;
}

export function toggleSavedId(id: string, storage: Storage = window.localStorage) {
  const current = readSavedIds(storage);
  if (current.includes(id)) {
    return writeSavedIds(current.filter((savedId) => savedId !== id), storage);
  }
  return writeSavedIds([...current, id], storage);
}

export function clearSavedIds(storage: Storage = window.localStorage) {
  storage.removeItem(STORAGE_KEY);
}
