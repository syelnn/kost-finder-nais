import React, { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { makeMarkerIcon } from '../lib/leafletIcons';

const DEFAULT_CENTER = [-6.9039, 107.6186]; // Kota Bandung

export default function LocationPickerMap({
  latitude,
  longitude,
  onSelect,
  onReverseGeocode,
}) {
  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const [loadingReverse, setLoadingReverse] = useState(false);

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
    const icon = makeMarkerIcon('available');

    if (!markerRef.current) {
      const marker = L.marker(pos, { draggable: true, icon }).addTo(map);
      marker.on('dragstart', () => {
        isDraggingRef.current = true;
      });
      marker.on('dragend', () => {
        isDraggingRef.current = false;
        const ll = marker.getLatLng();
        if (onSelectRef.current) {
          onSelectRef.current(Number(ll.lat.toFixed(7)), Number(ll.lng.toFixed(7)));
        }
      });
      markerRef.current = marker;
      map.setView(pos, 16);
    } else {
      const currentPos = markerRef.current.getLatLng();
      const dist = Math.hypot(currentPos.lat - pos[0], currentPos.lng - pos[1]);
      markerRef.current.setLatLng(pos);
      if (icon) markerRef.current.setIcon(icon);

      // Animasikan peta jika koordinat diubah dari luar (Autocomplete/form), bukan sedang didrag
      if (!isDraggingRef.current && dist > 0.00002) {
        map.flyTo(pos, 17, { duration: 1.2 });
      }
    }
  }, [hasCoord, latitude, longitude]);

  const handleReverseGeocodeClick = async () => {
    if (!hasCoord || !onReverseGeocode || loadingReverse) return;
    setLoadingReverse(true);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=id`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error('Gagal menghubungi geocoder');
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const jalan = addr.road || addr.pedestrian || addr.path || addr.suburb || '';
        const kec = addr.city_district || addr.suburb || addr.village || '';
        const kota = addr.city || addr.town || addr.county || 'Kota Bandung';
        const formatted = [jalan, kec, kota].filter(Boolean).join(', ');
        onReverseGeocode(formatted || data.display_name);
      } else if (data && data.display_name) {
        onReverseGeocode(data.display_name);
      }
    } catch {
      // Abaikan bila gagal koneksi reverse geocoding
    } finally {
      setLoadingReverse(false);
    }
  };

  return (
    <div className="picker-map-wrap">
      <div ref={mapElRef} className="picker-map" />
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 6 }}>
        <p className="field-hint" style={{ margin: 0 }}>
          Klik langsung pada peta atau geser marker hijau untuk menentukan titik lokasi kos. Koordinat terisi otomatis.
        </p>
        {hasCoord && onReverseGeocode && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleReverseGeocodeClick}
            disabled={loadingReverse}
            title="Isi kolom alamat berdasarkan titik marker di peta"
          >
            <MapPin size={16} strokeWidth={2} aria-hidden="true" />
            <span>{loadingReverse ? 'Mengambil alamat...' : 'Gunakan alamat dari titik ini'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
