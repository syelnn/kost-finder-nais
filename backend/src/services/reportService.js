const { query } = require('../config/db');
const { tanggalId, BULAN_ID } = require('../utils/format');

/**
 * Bangun kondisi WHERE untuk alias v (v_kos_ringkas) sesuai peran & filter.
 * Admin = semua data, Owner = hanya kos miliknya.
 */
function kosScope(user, filters, params) {
  const where = [];
  const p = (val) => {
    params.push(val);
    return `$${params.length}`;
  };
  if (user.role === 'Owner') where.push(`v.owner_id = ${p(user.user_id)}`);
  if (filters.wilayah) where.push(`v.wilayah = ${p(filters.wilayah)}`);
  if (filters.tipeKos) where.push(`v.tipe_kos = ${p(filters.tipeKos)}`);
  return { where, p };
}

async function getKos(user, filters) {
  const params = [];
  const { where } = kosScope(user, filters, params);
  const { rows } = await query(
    `SELECT v.kos_id, v.nama_kos, o.nama AS pemilik, v.alamat, v.wilayah, v.tipe_kos, v.status_verifikasi,
            v.latitude, v.longitude, v.jumlah_kamar, v.kamar_kosong, v.harga_mulai, v.rata_rating, v.jumlah_review
       FROM v_kos_ringkas v JOIN "user" o ON o.user_id = v.owner_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY v.wilayah, v.nama_kos`,
    params
  );
  return rows;
}

async function getKamar(user, filters) {
  const params = [];
  const { where } = kosScope(user, filters, params);
  const { rows } = await query(
    `SELECT km.kamar_id, v.nama_kos, v.wilayah, v.tipe_kos, km.no_kamar, km.tipe_kamar, km.harga, km.status_kamar
       FROM kamar km JOIN v_kos_ringkas v ON v.kos_id = km.kos_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY v.nama_kos, km.no_kamar`,
    params
  );
  return rows;
}

async function getBooking(user, filters) {
  const params = [];
  const { where, p } = kosScope(user, filters, params);
  if (filters.statusBooking) where.push(`b.status_booking = ${p(filters.statusBooking)}`);
  const { rows } = await query(
    `SELECT b.booking_id, b.tipe_booking, v.nama_kos, v.wilayah, v.tipe_kos, km.no_kamar, km.tipe_kamar, km.harga,
            u.nama AS nama_user, u.email AS email_user, b.tanggal_survey, b.status_booking, b.dibuat_pada
       FROM booking b
       JOIN v_kos_ringkas v ON v.kos_id = b.kos_id
       LEFT JOIN kamar km ON km.kamar_id = b.kamar_id
       JOIN "user" u ON u.user_id = b.user_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY b.dibuat_pada DESC`,
    params
  );
  return rows;
}

async function getWilayahOptions(user) {
  const params = [];
  let where = '';
  if (user.role === 'Owner') {
    params.push(user.user_id);
    where = 'WHERE owner_id = $1';
  }
  const { rows } = await query(`SELECT DISTINCT wilayah FROM v_kos_ringkas ${where} ORDER BY wilayah`, params);
  return rows.map((r) => r.wilayah);
}

function monthKeyJakarta(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit' }).format(new Date(date));
}

function lastMonths(n) {
  const now = new Date(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()) + 'T00:00:00Z');
  const out = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push({
      key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
      label: `${BULAN_ID[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}`,
    });
  }
  return out;
}

/** Data lengkap halaman laporan (tabel + grafik) sesuai filter & peran. */
async function getLaporan(user, filters) {
  const [kos, kamar, booking, wilayahOptions] = await Promise.all([
    getKos(user, filters),
    getKamar(user, filters),
    getBooking(user, filters),
    getWilayahOptions(user),
  ]);

  const perWilayah = {};
  kos.forEach((k) => {
    perWilayah[k.wilayah] = (perWilayah[k.wilayah] || 0) + 1;
  });
  const statusBooking = ['Menunggu', 'Disetujui', 'Ditolak', 'Selesai'];
  const statusKamar = ['Kosong', 'Dalam Booking', 'Terisi'];
  const months = lastMonths(12);
  const perBulan = Object.fromEntries(months.map((m) => [m.key, 0]));
  booking.forEach((b) => {
    const key = monthKeyJakarta(b.dibuat_pada);
    if (key in perBulan) perBulan[key] += 1;
  });
  const terisi = kamar.filter((k) => k.status_kamar === 'Terisi').length;

  return {
    filterOptions: {
      wilayah: wilayahOptions,
      tipeKos: ['Putra', 'Putri', 'Campur'],
      statusBooking,
    },
    filter: filters,
    ringkasan: {
      total_kos: kos.length,
      total_kamar: kamar.length,
      total_booking: booking.length,
      okupansi_persen: kamar.length ? Math.round((terisi / kamar.length) * 1000) / 10 : 0,
      estimasi_pendapatan: booking
        .filter((b) => b.tipe_booking !== 'survey' && ['Disetujui', 'Selesai'].includes(b.status_booking))
        .reduce((s, b) => s + Number(b.harga || 0), 0),
    },
    grafik: {
      kosPerWilayah: { labels: Object.keys(perWilayah), data: Object.values(perWilayah) },
      statusBooking: { labels: statusBooking, data: statusBooking.map((s) => booking.filter((b) => b.status_booking === s).length) },
      statusKamar: { labels: statusKamar, data: statusKamar.map((s) => kamar.filter((k) => k.status_kamar === s).length) },
      bookingPerBulan: { labels: months.map((m) => m.label), data: months.map((m) => perBulan[m.key]) },
    },
    kos,
    kamar,
    booking,
  };
}

// ---------- Definisi kolom ekspor ----------
const COLUMNS = {
  kos: [
    { key: 'kos_id', header: 'ID', type: 'int' },
    { key: 'nama_kos', header: 'Nama Kos' },
    { key: 'pemilik', header: 'Pemilik' },
    { key: 'alamat', header: 'Alamat' },
    { key: 'wilayah', header: 'Wilayah' },
    { key: 'tipe_kos', header: 'Tipe' },
    { key: 'status_verifikasi', header: 'Status' },
    { key: 'jumlah_kamar', header: 'Jml Kamar', type: 'int' },
    { key: 'kamar_kosong', header: 'Kamar Kosong', type: 'int' },
    { key: 'harga_mulai', header: 'Harga Mulai', type: 'rupiah' },
    { key: 'rata_rating', header: 'Rating', type: 'rating' },
  ],
  kamar: [
    { key: 'kamar_id', header: 'ID', type: 'int' },
    { key: 'nama_kos', header: 'Nama Kos' },
    { key: 'wilayah', header: 'Wilayah' },
    { key: 'tipe_kos', header: 'Tipe Kos' },
    { key: 'no_kamar', header: 'No. Kamar' },
    { key: 'tipe_kamar', header: 'Tipe Kamar' },
    { key: 'harga', header: 'Harga/Bulan', type: 'rupiah' },
    { key: 'status_kamar', header: 'Status' },
  ],
  booking: [
    { key: 'booking_id', header: 'ID', type: 'int' },
    { key: 'nama_kos', header: 'Nama Kos' },
    { key: 'wilayah', header: 'Wilayah' },
    { key: 'kamar', header: 'Kamar' },
    { key: 'nama_user', header: 'Pencari Kos' },
    { key: 'tanggal_survey', header: 'Tgl Survey', type: 'date' },
    { key: 'status_booking', header: 'Status' },
    { key: 'harga', header: 'Harga/Bulan', type: 'rupiah' },
    { key: 'dibuat_pada', header: 'Dibuat', type: 'date' },
  ],
};

const TITLES = { kos: 'Laporan Data Kos', kamar: 'Laporan Data Kamar', booking: 'Laporan Data Booking' };

async function getExportRows(jenis, user, filters) {
  if (jenis === 'kos') return getKos(user, filters);
  if (jenis === 'kamar') return getKamar(user, filters);
  const rows = await getBooking(user, filters);
  return rows.map((r) => ({
    ...r,
    kamar: r.no_kamar ? `No. ${r.no_kamar} - ${r.tipe_kamar}` : 'Survey Umum',
  }));
}

function describeFilter(filters) {
  const parts = [];
  if (filters.wilayah) parts.push(`Wilayah: ${filters.wilayah}`);
  if (filters.tipeKos) parts.push(`Tipe Kos: ${filters.tipeKos}`);
  if (filters.statusBooking) parts.push(`Status Booking: ${filters.statusBooking}`);
  return parts.length ? parts.join(' | ') : 'Semua data (tanpa filter)';
}

module.exports = {
  getLaporan,
  getExportRows,
  getWilayahOptions,
  describeFilter,
  COLUMNS,
  TITLES,
  tanggalId,
};
