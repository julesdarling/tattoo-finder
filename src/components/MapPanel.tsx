import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import type { TattooRecord } from '../lib/schema';
import { sourceLabel } from '../lib/recordMeta';
import { cn } from '../lib/cn';

const markerIcon = new Icon({
  iconUrl:
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="34" viewBox="0 0 26 34"><path fill="%23d9a915" stroke="%2324211a" stroke-width="2" d="M13 32s11-11.2 11-19A11 11 0 1 0 2 13c0 7.8 11 19 11 19Z"/><circle cx="13" cy="13" r="4.2" fill="%2324211a"/></svg>',
  iconSize: [26, 34],
  iconAnchor: [13, 34],
  popupAnchor: [0, -30],
});

type MapPanelProps = {
  records: TattooRecord[];
  selectedId: string | null;
  onSelect: (record: TattooRecord) => void;
};

export function MapPanel({ records, selectedId, onSelect }: MapPanelProps) {
  const selected = records.find((record) => record.id === selectedId) ?? records[0];
  const center: [number, number] = selected ? [selected.lat, selected.lng] : [37.7749, -122.4194];
  const visibleRecords = records;
  const [tileFailed, setTileFailed] = useState(false);

  return (
    <section className="map-shell" aria-label="Bay Area map" role="region">
      <MapContainer center={center} zoom={9} scrollWheelZoom={false} className="leaflet-map">
        <ResizeInvalidator watchKey={`${records.length}-${selectedId ?? 'none'}`} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          eventHandlers={{
            tileerror: () => setTileFailed(true),
            tileload: () => setTileFailed(false),
          }}
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {visibleRecords.map((record) => (
          <Marker
            key={record.id}
            position={[record.lat, record.lng]}
            icon={markerIcon}
            eventHandlers={{ click: () => onSelect(record) }}
          >
            <Popup>
              <strong>{record.name}</strong>
              <br />
              {record.city}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="map-index" aria-label="Map record index">
        {visibleRecords.slice(0, 8).map((record) => (
          <button
            key={record.id}
            type="button"
            className={cn('map-chip', selectedId === record.id && 'is-active')}
            onClick={() => onSelect(record)}
          >
            <span>{record.name}</span>
            <small>{sourceLabel(record)}</small>
          </button>
        ))}
      </div>
      {tileFailed ? (
        <div className="map-warning" role="status">
          Map tiles are unavailable. Pins and source links are still usable.
        </div>
      ) : null}
    </section>
  );
}

function ResizeInvalidator({ watchKey }: { watchKey: string }) {
  const map = useMap();

  useEffect(() => {
    const invalidate = () => map.invalidateSize({ pan: false });
    const timeout = window.setTimeout(invalidate, 0);
    const container = map.getContainer();

    if (!('ResizeObserver' in window)) {
      return () => window.clearTimeout(timeout);
    }

    const observer = new ResizeObserver(invalidate);
    observer.observe(container);

    return () => {
      window.clearTimeout(timeout);
      observer.disconnect();
    };
  }, [map, watchKey]);

  return null;
}
