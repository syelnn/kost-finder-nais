const { query, withTransaction } = require('../config/db');

/** Ekspresi SQL tanggal hari ini menurut zona Asia/Jakarta (WIB). */
const TODAY_WIB = "(now() AT TIME ZONE 'Asia/Jakarta')::date";

/**
 * Sinkronisasi status kamar dari status booking aktif (satu-satunya sumber logika status kamar otomatis).
 *   ada booking Menunggu  -> 'Dalam Booking'
 *   ada booking Disetujui -> 'Terisi'
 *   tidak ada booking aktif (Ditolak / Selesai) -> 'Kosong'
 * Wajib dipanggil di dalam transaksi yang sama dengan perubahan booking.
 * @param {import('pg').PoolClient} client
 * @param {number} kamarId
 * @returns {Promise<string>} status_kamar baru
 */
async function syncRoomStatus(client, kamarId) {
  const { rows } = await client.query(
    `SELECT status_booking FROM booking
      WHERE kamar_id = $1 AND status_booking IN ('Menunggu', 'Disetujui')
      ORDER BY booking_id DESC LIMIT 1`,
    [kamarId]
  );
  let status = 'Kosong';
  if (rows.length && rows[0].status_booking === 'Disetujui') status = 'Terisi';
  else if (rows.length && rows[0].status_booking === 'Menunggu') status = 'Dalam Booking';
  await client.query('UPDATE kamar SET status_kamar = $2 WHERE kamar_id = $1', [kamarId, status]);
  return status;
}

/**
 * Auto-Selesai: booking 'Disetujui' dengan tanggal_survey < hari ini (WIB) -> 'Selesai', kamar -> 'Kosong'.
 * Berjalan di satu transaksi. Mengembalikan jumlah booking yang diselesaikan.
 */
async function autoSelesai() {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `UPDATE booking SET status_booking = 'Selesai'
        WHERE status_booking = 'Disetujui' AND tanggal_survey < ${TODAY_WIB}
        RETURNING booking_id, kamar_id`
    );
    const kamarIds = [...new Set(rows.map((r) => r.kamar_id))];
    for (const id of kamarIds) {
      await syncRoomStatus(client, id);
    }
    return rows.length;
  });
}

/** Versi aman (tidak melempar error) untuk dipanggil sebelum list/dashboard. */
async function autoSelesaiSafe() {
  try {
    return await autoSelesai();
  } catch (err) {
    console.error('[AUTO-SELESAI] Gagal:', err.message);
    return 0;
  }
}

/** Apakah tanggal 'YYYY-MM-DD' sebelum hari ini (WIB)? */
async function isPastDate(dateStr) {
  const { rows } = await query(`SELECT $1::date < ${TODAY_WIB} AS lampau`, [dateStr]);
  return rows[0].lampau;
}

module.exports = { syncRoomStatus, autoSelesai, autoSelesaiSafe, isPastDate, TODAY_WIB };
