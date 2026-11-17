import React, { useEffect, useRef } from 'react';

const DEFAULT_CENTER = [-6.9039, 107.6186]; // Kota Bandung

export default function LocationPickerMap({ latitude, longitude, onSelect }) {
  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const hasCoord =
    latitude !== null &&
    latitude !== undefined &&
    latitude !== '' &&
    longitude !== null &&
    longitude !== undefined &&
    longitude !== '';

  useEffect(() => {
    const L = window.L;
    if (!L || !mapElRef.current || mapRef.current) return undefined;

    const initial = hasCoord ? [Number(latitude), Number(longitude)] : DEFAULT_CENTER;
    const map = L.map(mapElRef.current).setView(initial, hasCoord ? 16 : 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    map.on('click', (e) => {
      const lat = Number(e.latlng.lat.toFixed(7));
      const lng = Number(e.latlng.lng.toFixed(7));
      if (onSelectRef.current) onSelectRef.current(lat, lng);
    });

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 150);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const L = window.L;
    const map = mapRef.current;
    if (!L || !map) return;

    if (!hasCoord) {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      return;
    }

    const pos = [Number(latitude), Number(longitude)];
    const icon = L.divIcon({
      className: 'custom-div-marker',
      html: '<div class="marker-pin marker-green" title="Titik lokasi kos (geser untuk menyesuaikan)"></div>',
      iconSize: [30, 30],
      iconAnchor: [15, 30],
    });

    if (!markerRef.current) {
      const marker = L.marker(pos, { draggable: true, icon }).addTo(map);
      marker.on('dragend', () => {
        const ll = marker.getLatLng();
        if (onSelectRef.current) {
          onSelectRef.current(Number(ll.lat.toFixed(7)), Number(ll.lng.toFixed(7)));
        }
      });
      markerRef.current = marker;
      map.setView(pos, 16);
    } else {
      markerRef.current.setLatLng(pos);
    }
  }, [hasCoord, latitude, longitude]);

  return (
    <div className="picker-map-wrap">
      <div ref={mapElRef} className="picker-map" />
      <p className="field-hint">
        Klik langsung pada peta atau geser marker hijau untuk menentukan titik lokasi kos. Koordinat terisi otomatis.
      </p>
    </div>
  );
}
