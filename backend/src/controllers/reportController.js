const { query } = require('../config/db');
const { AppError, ok } = require('../utils/http');
const { autoSelesaiSafe } = require('../services/bookingService');
const report = require('../services/reportService');
const { buildPdf, buildXlsx, buildCsv } = require('../services/exportService');
const { todayJakarta } = require('../utils/format');

function filtersFrom(req) {
  const q = req.validQuery || {};
  return { wilayah: q.wilayah, tipeKos: q.tipeKos, statusBooking: q.statusBooking };
}

function scopeText(user) {
  return user.role === 'Admin' ? 'Cakupan: semua data (Admin)' : `Cakupan: data milik ${user.nama} (Pemilik Kos)`;
}

async function laporan(req, res) {
  await autoSelesaiSafe();
  const data = await report.getLaporan(req.user, filtersFrom(req));
  return ok(res, data);
}

async function exportData(req, res) {
  const { jenis, format } = req.params;
  if (!['kos', 'kamar', 'booking'].includes(jenis)) throw new AppError(404, 'Jenis data ekspor tidak dikenal (kos/kamar/booking).');
  if (!['pdf', 'xlsx'].includes(format)) throw new AppError(404, 'Format ekspor tidak dikenal (pdf/xlsx).');
  const filters = filtersFrom(req);
  const rows = await report.getExportRows(jenis, req.user, filters);
  const columns = report.COLUMNS[jenis];
  const title = report.TITLES[jenis];
  const filename = `laporan-${jenis}-${todayJakarta()}.${format}`;

  let buffer;
  if (format === 'pdf') {
    buffer = await buildPdf({ title, subtitle: scopeText(req.user), filterText: report.describeFilter(filters), columns, rows });
    res.setHeader('Content-Type', 'application/pdf');
  } else {
    buffer = await buildXlsx([{ name: title.replace('Laporan ', ''), columns, rows }]);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  return res.end(buffer);
}

// ---------- BACKUP ----------
// Daftar kolom eksplisit per tabel (kolom password TIDAK PERNAH diikutkan).
const BACKUP_COLUMNS = {
  user: ['user_id', 'nama', 'email', 'role', 'no_wa', 'status_verifikasi'],
  kos: ['kos_id', 'owner_id', 'nama_kos', 'alamat', 'latitude', 'longitude', 'tipe_kos', 'status_verifikasi'],
  foto_kos: ['foto_id', 'kos_id', 'path_foto'],
  fasilitas: ['fasilitas_id', 'nama_fasilitas'],
  kos_fasilitas: ['kos_id', 'fasilitas_id'],
  kamar: ['kamar_id', 'kos_id', 'no_kamar', 'tipe_kamar', 'harga', 'status_kamar'],
  booking: ['booking_id', 'kos_id', 'kamar_id', 'user_id', 'tipe_booking', 'tanggal_survey', 'status_booking', 'dibuat_pada'],
  review: ['review_id', 'booking_id', 'rating', 'komentar', 'dibuat_pada'],
};
const BACKUP_TABLES = Object.keys(BACKUP_COLUMNS);

async function backupRows(table, user) {
  const cols = BACKUP_COLUMNS[table];
  const sel = (alias) => cols.map((c) => `${alias}.${c}`).join(', ');
  if (user.role === 'Admin') {
    const from = table === 'user' ? '"user"' : table;
    const { rows } = await query(`SELECT ${sel('t')} FROM ${from} t ORDER BY 1`);
    return rows;
  }
  const id = user.user_id;
  const sqlOwner = {
    user: `SELECT ${sel('t')} FROM "user" t
            WHERE t.user_id = $1
               OR t.user_id IN (SELECT b.user_id FROM booking b
                                  JOIN kos k ON k.kos_id = b.kos_id WHERE k.owner_id = $1)
            ORDER BY 1`,
    kos: `SELECT ${sel('t')} FROM kos t WHERE t.owner_id = $1 ORDER BY 1`,
    foto_kos: `SELECT ${sel('t')} FROM foto_kos t JOIN kos k ON k.kos_id = t.kos_id WHERE k.owner_id = $1 ORDER BY 1`,
    fasilitas: `SELECT ${sel('t')} FROM fasilitas t WHERE $1::int IS NOT NULL ORDER BY 1`,
    kos_fasilitas: `SELECT ${sel('t')} FROM kos_fasilitas t JOIN kos k ON k.kos_id = t.kos_id WHERE k.owner_id = $1 ORDER BY 1, 2`,
    kamar: `SELECT ${sel('t')} FROM kamar t JOIN kos k ON k.kos_id = t.kos_id WHERE k.owner_id = $1 ORDER BY 1`,
    booking: `SELECT ${sel('t')} FROM booking t
               JOIN kos k ON k.kos_id = t.kos_id WHERE k.owner_id = $1 ORDER BY 1`,
    review: `SELECT ${sel('t')} FROM review t JOIN booking b ON b.booking_id = t.booking_id
              JOIN kos k ON k.kos_id = b.kos_id
             WHERE k.owner_id = $1 ORDER BY 1`,
  };
  const { rows } = await query(sqlOwner[table], [id]);
  return rows;
}

const rawColumns = (table) => BACKUP_COLUMNS[table].map((c) => ({ key: c, header: c }));

async function backupXlsx(req, res) {
  const sheets = [];
  for (const table of BACKUP_TABLES) {
    const rows = await backupRows(table, req.user);
    sheets.push({
      name: table,
      columns: rawColumns(table),
      rows: rows.map((r) => ({ ...r, dibuat_pada: r.dibuat_pada ? new Date(r.dibuat_pada).toISOString() : r.dibuat_pada })),
    });
  }
  const buffer = await buildXlsx(sheets);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="backup-kos-finder-${todayJakarta()}.xlsx"`);
  res.setHeader('Content-Length', buffer.length);
  return res.end(buffer);
}

async function backupCsv(req, res) {
  const { tabel } = req.params;
  if (!BACKUP_TABLES.includes(tabel)) {
    throw new AppError(404, `Tabel "${tabel}" tidak tersedia untuk backup. Pilihan: ${BACKUP_TABLES.join(', ')}.`);
  }
  const rows = await backupRows(tabel, req.user);
  const buffer = await buildCsv(rawColumns(tabel), rows);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="backup-${tabel}-${todayJakarta()}.csv"`);
  res.setHeader('Content-Length', buffer.length);
  return res.end(buffer);
}

module.exports = { laporan, exportData, backupXlsx, backupCsv, BACKUP_TABLES };
