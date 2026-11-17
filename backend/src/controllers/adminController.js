const { query, withTransaction } = require('../config/db');
const { AppError, ok } = require('../utils/http');
const { autoSelesaiSafe } = require('../services/bookingService');
const { monthSeries } = require('../services/statsService');

async function listOwners(req, res) {
  const { status } = req.validQuery;
  const params = [];
  let where = `WHERE u.role = 'Owner'`;
  if (status) {
    params.push(status);
    where += ` AND u.status_verifikasi = $${params.length}`;
  }
  const { rows } = await query(
    `SELECT u.user_id, u.nama, u.email, u.no_wa, u.role, u.status_verifikasi,
            COUNT(k.kos_id)::int AS jumlah_kos,
            COUNT(k.kos_id) FILTER (WHERE k.status_verifikasi = 'Aktif')::int AS kos_aktif
       FROM "user" u
       LEFT JOIN kos k ON k.owner_id = u.user_id
       ${where}
      GROUP BY u.user_id
      ORDER BY (u.status_verifikasi = 'Menunggu') DESC, u.nama ASC`,
    params
  );
  return ok(res, rows);
}

async function verifikasiOwner(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  const result = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `UPDATE "user" SET status_verifikasi = $2
        WHERE user_id = $1 AND role = 'Owner'
        RETURNING user_id, nama, email, no_wa, role, status_verifikasi`,
      [id, status]
    );
    if (!rows.length) throw new AppError(404, 'Pemilik kos tidak ditemukan.');
    let kosDinonaktifkan = 0;
    if (status === 'Menunggu') {
      const upd = await client.query(
        `UPDATE kos SET status_verifikasi = 'Nonaktif' WHERE owner_id = $1 AND status_verifikasi = 'Aktif'`,
        [id]
      );
      kosDinonaktifkan = upd.rowCount;
    }
    return { owner: rows[0], kos_dinonaktifkan: kosDinonaktifkan };
  });
  const message =
    status === 'Terverifikasi'
      ? `Akun ${result.owner.nama} berhasil diverifikasi.`
      : `Verifikasi ${result.owner.nama} dibatalkan. ${result.kos_dinonaktifkan} kos aktif dinonaktifkan.`;
  return ok(res, result, message);
}

async function dashboard(req, res) {
  await autoSelesaiSafe();
  const [kartu, wilayah, pertumbuhan, statusBooking] = await Promise.all([
    query(`SELECT
             (SELECT COUNT(*) FROM kos)::int AS total_kos,
             (SELECT COUNT(*) FROM kos WHERE status_verifikasi = 'Aktif')::int AS kos_aktif,
             (SELECT COUNT(*) FROM "user" WHERE role = 'Owner' AND status_verifikasi = 'Menunggu')::int AS owner_menunggu,
             (SELECT COUNT(*) FROM booking)::int AS total_booking,
             (SELECT COUNT(*) FROM "user" WHERE role = 'User')::int AS total_user,
             (SELECT COUNT(*) FROM "user" WHERE role = 'Owner')::int AS total_owner`),
    query(`SELECT wilayah, COUNT(*)::int AS jumlah FROM v_kos_ringkas GROUP BY wilayah ORDER BY jumlah DESC, wilayah`),
    monthSeries(12, 'COUNT(b.booking_id)', 'booking b', '', []),
    query(`SELECT status_booking AS status, COUNT(*)::int AS jumlah FROM booking GROUP BY status_booking`),
  ]);
  return ok(res, {
    kartu: kartu.rows[0],
    grafik: {
      kosPerWilayah: { labels: wilayah.rows.map((r) => r.wilayah), data: wilayah.rows.map((r) => r.jumlah) },
      pertumbuhanBooking: pertumbuhan,
      statusBooking: {
        labels: ['Menunggu', 'Disetujui', 'Ditolak', 'Selesai'],
        data: ['Menunggu', 'Disetujui', 'Ditolak', 'Selesai'].map(
          (s) => statusBooking.rows.find((r) => r.status === s)?.jumlah || 0
        ),
      },
    },
  });
}

module.exports = { listOwners, verifikasiOwner, dashboard };
