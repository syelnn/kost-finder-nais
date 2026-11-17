const { query } = require('../config/db');
const { AppError, ok, created } = require('../utils/http');

async function list(req, res) {
  const { rows } = await query(
    `SELECT f.fasilitas_id, f.nama_fasilitas, COUNT(kf.kos_id)::int AS jumlah_kos
       FROM fasilitas f
       LEFT JOIN kos_fasilitas kf ON kf.fasilitas_id = f.fasilitas_id
      GROUP BY f.fasilitas_id
      ORDER BY f.nama_fasilitas`
  );
  return ok(res, rows);
}

async function ensureUnique(nama, exceptId) {
  const { rowCount } = await query(
    'SELECT 1 FROM fasilitas WHERE lower(nama_fasilitas) = lower($1) AND fasilitas_id <> $2',
    [nama, exceptId || 0]
  );
  if (rowCount) {
    throw new AppError(409, 'Nama fasilitas sudah ada.', { nama_fasilitas: 'Nama fasilitas sudah ada.' });
  }
}

async function create(req, res) {
  const { nama_fasilitas } = req.body;
  await ensureUnique(nama_fasilitas);
  const { rows } = await query(
    'INSERT INTO fasilitas (nama_fasilitas) VALUES ($1) RETURNING fasilitas_id, nama_fasilitas',
    [nama_fasilitas]
  );
  return created(res, { ...rows[0], jumlah_kos: 0 }, 'Fasilitas berhasil ditambahkan.');
}

async function update(req, res) {
  const { id } = req.params;
  const { nama_fasilitas } = req.body;
  await ensureUnique(nama_fasilitas, id);
  const { rows } = await query(
    'UPDATE fasilitas SET nama_fasilitas = $2 WHERE fasilitas_id = $1 RETURNING fasilitas_id, nama_fasilitas',
    [id, nama_fasilitas]
  );
  if (!rows.length) throw new AppError(404, 'Fasilitas tidak ditemukan.');
  return ok(res, rows[0], 'Fasilitas berhasil diperbarui.');
}

async function remove(req, res) {
  const { id } = req.params;
  const { rows } = await query('DELETE FROM fasilitas WHERE fasilitas_id = $1 RETURNING nama_fasilitas', [id]);
  if (!rows.length) throw new AppError(404, 'Fasilitas tidak ditemukan.');
  return ok(res, null, `Fasilitas "${rows[0].nama_fasilitas}" berhasil dihapus.`);
}

module.exports = { list, create, update, remove };
