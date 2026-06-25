import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import type { TattooRecord } from '../lib/schema';
import { bookingLabel } from '../lib/recordMeta';

type MapPanelProps = {
  records: TattooRecord[];
  selectedId?: string | null;
  onSelect: (record: TattooRecord) => void;
};

const markerIcon = (selected: boolean) =>
  L.divIcon({
    className: selected ? 'pin-marker is-selected' : 'pin-marker',
    html: '<span></span>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

export function MapPanel({ records, selectedId, onSelect }: MapPanelProps) {
  const center: [number, number] = records.length
    ? [average(records.map((record) => record.lat)), average(records.map((record) => record.lng))]
    : [37.7749, -122.4194];

  return (
    <div className="map-panel" data-testid="map-panel">
      <MapContainer center={center} zoom={records.length ? 9 : 10} scrollWheelZoom className="leaflet-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <InvalidateMapSize />
        <FitBounds records={records} />
        {records.slice(0, 300).map((record) => (
          <Marker
            key={record.id}
            position={[record.lat, record.lng]}
            icon={markerIcon(record.id === selectedId)}
            eventHandlers={{ click: () => onSelect(record) }}
          >
            <Popup>
              <strong>{record.name}</strong>
              <br />
              {record.city}, {record.region}
              <br />
              {bookingLabel(record)}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="map-count">{records.length} mapped</div>
    </div>
  );
}

function InvalidateMapSize() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    let frame = window.requestAnimationFrame(() => map.invalidateSize());
    const resizeObserver = new ResizeObserver(() => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => map.invalidateSize());
    });
    resizeObserver.observe(container);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, [map]);
  return null;
}

function FitBounds({ records }: { records: TattooRecord[] }) {
  const map = useMap();
  useEffect(() => {
    if (!records.length) return;
    const bounds = L.latLngBounds(records.slice(0, 300).map((record) => [record.lat, record.lng]));
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 12 });
  }, [map, records]);
  return null;
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
