import { useEffect, useMemo, useState } from 'react';
import type { TattooRecord } from './schema';
import { hasPrototypeArtwork, isPrototypeArtworkEnabled, mergePrototypeArtwork, type PrototypeArtworkPayload } from './prototypeArtwork';

export function usePrototypeRecords(records: TattooRecord[]) {
  const [enabled, setEnabled] = useState(false);
  const [payload, setPayload] = useState<PrototypeArtworkPayload | null>(null);

  useEffect(() => {
    if (!isPrototypeArtworkEnabled()) return;
    setEnabled(true);
    const controller = new AbortController();

    fetch(`${import.meta.env.BASE_URL}prototype-artwork.json`, { signal: controller.signal, cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((nextPayload: PrototypeArtworkPayload | null) => {
        if (nextPayload?.mode === 'local-prototype') setPayload(nextPayload);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setPayload(null);
      });

    return () => controller.abort();
  }, []);

  const mergedRecords = useMemo(() => mergePrototypeArtwork(records, payload), [records, payload]);
  const artworkRecords = useMemo(() => (payload ? mergedRecords.filter(hasPrototypeArtwork) : mergedRecords), [mergedRecords, payload]);

  return {
    records: artworkRecords,
    prototypeEnabled: enabled,
    prototypeLoaded: Boolean(payload),
  };
}
