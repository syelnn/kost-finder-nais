const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export function formatRupiah(value) {
  if (value === null || value === undefined || value === '') return '-';
  const num = Math.round(Number(value));
  if (Number.isNaN(num)) return '-';
  return `Rp ${num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

export function formatTanggal(value) {
  if (!value) return '-';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return `${String(d).padStart(2, '0')} ${BULAN[m - 1]} ${y}`;
  }
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  const s = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(dt);
  return formatTanggal(s);
}

export function formatJarak(km) {
  if (km === null || km === undefined || km === '') return null;
  const num = Number(km);
  if (Number.isNaN(num)) return null;
  return `${num.toFixed(1).replace('.', ',')} km`;
}

export function formatRating(rating) {
  if (rating === null || rating === undefined || rating === '') return 'Belum ada';
  const num = Number(rating);
  if (Number.isNaN(num)) return 'Belum ada';
  return num.toFixed(1).replace('.', ',');
}

export function todayWIB() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
}

export function fotoUrl(relPath) {
  if (!relPath) return null;
  if (/^https?:\/\//i.test(relPath)) return relPath;
  const clean = String(relPath).replace(/^\/+/, '').replace(/^uploads\/+/i, '');
  return `/uploads/${clean}`;
}

export function placeholderSvgDataUri(label = 'Kos Finder') {
  const safe = String(label).replace(/[<>&"]/g, '').slice(0, 28) || 'Kos Finder';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0f766e"/>
        <stop offset="100%" stop-color="#0d9488"/>
      </linearGradient>
    </defs>
    <rect width="640" height="360" fill="url(#g)"/>
    <g fill="#f0fdfa" opacity="0.92" transform="translate(270,95)">
      <path d="M50 10 L98 48 L86 48 L86 96 L60 96 L60 66 L40 66 L40 96 L14 96 L14 48 L2 48 Z"/>
    </g>
    <text x="320" y="235" text-anchor="middle" fill="#ffffff" font-family="Plus Jakarta Sans, sans-serif" font-size="22" font-weight="700">${safe}</text>
    <text x="320" y="264" text-anchor="middle" fill="#ccfbf1" font-family="Plus Jakarta Sans, sans-serif" font-size="14">Foto Kos</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const KAMPUS_PRESETS = [
  { nama: 'UPI Bandung', lat: -6.8604, lng: 107.5942 },
  { nama: 'ITB Ganesha', lat: -6.8915, lng: 107.6107 },
  { nama: 'Unpad Dipati Ukur', lat: -6.8938, lng: 107.6186 },
  { nama: 'Telkom University', lat: -6.9733, lng: 107.6305 },
];
