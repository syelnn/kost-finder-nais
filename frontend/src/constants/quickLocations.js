/**
 * Daftar titik acuan cepat (Pilihan Cepat) pada halaman peta (/peta).
 * P.T Cifo dan Universitas Pasim ditempatkan di urutan teratas.
 */
export const QUICK_LOCATION_PRESETS = [
  {
    id: 'pt-cifo',
    label: 'P.T Cifo',
    alamat: 'Jl. Mentor No.53, Sukaraja, Kec. Cicendo, Kota Bandung, Jawa Barat 40175',
    // Diverifikasi di Jl. Mentor, Sukaraja, Cicendo via Nominatim OSM.
    // TODO: verifikasi titik gedung No.53 secara visual di Google Maps bila ingin presisi hingga gerbang.
    lat: -6.8915,
    lng: 107.5699,
  },
  {
    id: 'universitas-pasim',
    label: 'Universitas Pasim',
    alamat: 'Jl. Dakota No.8A, Sukaraja, Kec. Cicendo, Kota Bandung, Jawa Barat 40175',
    // Diverifikasi di Jl. Dakota, Sukaraja, Cicendo via Nominatim OSM.
    // TODO: verifikasi titik kampus No.8A secara visual di Google Maps bila ingin presisi hingga gerbang.
    lat: -6.894308,
    lng: 107.572101,
  },
  {
    id: 'upi-bandung',
    label: 'UPI Bandung',
    alamat: 'Jl. Dr. Setiabudi No.229, Isola, Kec. Sukasari, Kota Bandung',
    lat: -6.8604,
    lng: 107.5942,
  },
  {
    id: 'itb-ganesha',
    label: 'ITB Ganesha',
    alamat: 'Jl. Ganesa No.10, Lb. Siliwangi, Kec. Coblong, Kota Bandung',
    lat: -6.8915,
    lng: 107.6107,
  },
  {
    id: 'unpad-dipati-ukur',
    label: 'Unpad Dipati Ukur',
    alamat: 'Jl. Dipati Ukur No.35, Lebakgede, Kec. Coblong, Kota Bandung',
    lat: -6.8938,
    lng: 107.6186,
  },
  {
    id: 'telkom-university',
    label: 'Telkom University',
    alamat: 'Jl. Telekomunikasi No.1, Terusan Buahbatu, Kec. Dayeuhkolot, Kab. Bandung',
    lat: -6.9733,
    lng: 107.6305,
  },
];
