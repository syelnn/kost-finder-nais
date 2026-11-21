/**
 * Helper terpusat pembuat ikon marker Leaflet memakai aset resmi Leaflet 1.9.4.
 * Warna dibedakan lewat CSS filter pada className (lihat src/styles/leaflet-markers.css):
 *  - 'available' / 'green'     -> .marker-available (hijau: ada kamar kosong)
 *  - 'full' / 'gray'           -> .marker-full      (abu-abu: kamar penuh)
 *  - 'reference' / 'blue'      -> .marker-reference (biru bawaan: titik acuan & radius)
 */

export const LEAFLET_MARKER_ICON_URL =
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
export const LEAFLET_MARKER_SHADOW_URL =
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const VARIANT_CLASS = {
  available: 'marker-available',
  green: 'marker-available',
  full: 'marker-full',
  gray: 'marker-full',
  reference: 'marker-reference',
  blue: 'marker-reference',
};

/**
 * Membuat instance L.icon resmi Leaflet dengan ukuran 25x41 (skala 2x dari 50x82).
 * @param {'available' | 'full' | 'reference' | 'green' | 'gray' | 'blue'} variant
 * @returns {L.Icon | null}
 */
export function makeMarkerIcon(variant = 'reference') {
  const L = window.L;
  if (!L) return null;

  const className = VARIANT_CLASS[variant] || 'marker-reference';

  return L.icon({
    iconUrl: LEAFLET_MARKER_ICON_URL,
    shadowUrl: LEAFLET_MARKER_SHADOW_URL,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    className,
  });
}
