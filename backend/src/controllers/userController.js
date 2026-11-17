const { query, withTransaction } = require('../config/db');
const { AppError, ok, created } = require('../utils/http');
const { syncRoomStatus, autoSelesaiSafe, isPastDate } = require('../services/bookingService');

// ======================== PENCARIAN KOS ========================
async function searchKos(req, res) {
  const { lat, lng, radius, hargaMin, hargaMax, fasilitas, tipe } = req.validQuery;
  const params = [];
  const where = [`v.status_verifikasi = 'Aktif'`];
  const p = (val) => {
    params.push(val);
    return `$${params.length}`;
  };

  let jarakExpr = 'NULL::double precision';
  const hasRef = lat !== undefined && lng !== undefined;
  if (hasRef) {
    jarakExpr = `haversine_km(${p(lat)}::numeric, ${p(lng)}::numeric, v.latitude, v.longitude)`;
    if (radius !== undefined) where.push(`${jarakExpr} <= ${p(radius)}`);
  }
  if (hargaMin !== undefined || hargaMax !== undefined) {
    const cond = ['km.kos_id = v.kos_id'];
    if (hargaMin !== undefined) cond.push(`km.harga >= ${p(hargaMin)}`);
    if (hargaMax !== undefined) cond.push(`km.harga <= ${p(hargaMax)}`);
    where.push(`EXISTS (SELECT 1 FROM kamar km WHERE ${cond.join(' AND ')})`);
  }
  if (fasilitas && fasilitas.length) {
    const ref = p(fasilitas);
    where.push(
      `(SELECT COUNT(DISTINCT kf.fasilitas_id) FROM kos_fasilitas kf
         WHERE kf.kos_id = v.kos_id AND kf.fasilitas_id = ANY(${ref}::int[])) = cardinality(${ref}::int[])`
    );
  }
  if (tipe) where.push(`v.tipe_kos = ${p(tipe)}`);

  const { rows } = await query(
    `SELECT v.kos_id, v.nama_kos, v.alamat, v.latitude, v.longitude, v.tipe_kos, v.wilayah,
            v.jumlah_kamar, v.kamar_kosong, v.harga_mulai, v.rata_rating, v.jumlah_review,
            CASE WHEN ${hasRef ? 'TRUE' : 'FALSE'} THEN round((${jarakExpr})::numeric, 2) END AS jarak_km,
            (SELECT f.path_foto FROM foto_kos f WHERE f.kos_id = v.kos_id ORDER BY f.foto_id LIMIT 1) AS foto,
            COALESCE((SELECT array_agg(fs.nama_fasilitas ORDER BY fs.nama_fasilitas)
                        FROM kos_fasilitas kf JOIN fasilitas fs ON fs.fasilitas_id = kf.fasilitas_id
                       WHERE kf.kos_id = v.kos_id), '{}') AS fasilitas
       FROM v_kos_ringkas v
      WHERE ${where.join(' AND ')}
      ORDER BY ${hasRef ? 'jarak_km ASC,' : ''} v.nama_kos ASC`,
    params
  );
  return ok(res, rows);
}

async function detailKos(req, res) {
  const { rows } = await query(`SELECT * FROM v_kos_ringkas WHERE kos_id = $1 AND status_verifikasi = 'Aktif'`, [req.params.id]);
  if (!rows.length) throw new AppError(404, 'Kos tidak ditemukan atau tidak aktif.');
  const kos = rows[0];
  const [owner, foto, fasilitas, kamar, review] = await Promise.all([
    query('SELECT nama, no_wa FROM "user" WHERE user_id = $1', [kos.owner_id]),
    query('SELECT foto_id, path_foto FROM foto_kos WHERE kos_id = $1 ORDER BY foto_id', [kos.kos_id]),
    query(
      `SELECT f.fasilitas_id, f.nama_fasilitas FROM kos_fasilitas kf
         JOIN fasilitas f ON f.fasilitas_id = kf.fasilitas_id WHERE kf.kos_id = $1 ORDER BY f.nama_fasilitas`,
      [kos.kos_id]
    ),
    query('SELECT kamar_id, no_kamar, tipe_kamar, harga, status_kamar FROM kamar WHERE kos_id = $1 ORDER BY harga, no_kamar', [
      kos.kos_id,
    ]),
    query(
      `SELECT r.review_id, r.rating, r.komentar, r.dibuat_pada, u.nama AS nama_user, km.no_kamar, km.tipe_kamar
         FROM review r
         JOIN booking b ON b.booking_id = r.booking_id
         JOIN kamar km ON km.kamar_id = b.kamar_id
         JOIN "user" u ON u.user_id = b.user_id
        WHERE km.kos_id = $1
        ORDER BY r.dibuat_pada DESC`,
      [kos.kos_id]
    ),
  ]);
  return ok(res, {
    ...kos,
    pemilik: owner.rows[0] || null,
    foto: foto.rows,
    fasilitas: fasilitas.rows,
    kamar: kamar.rows,
    review: review.rows,
  });
}

// ======================== BOOKING ========================
async function createBooking(req, res) {
  const { kamar_id: kamarId, tanggal_survey: tanggal } = req.body;
  if (await isPastDate(tanggal)) {
    throw new AppError(422, 'Tanggal survey tidak boleh sebelum hari ini.', {
      tanggal_survey: 'Tanggal survey minimal hari ini.',
    });
  }
  try {
    const booking = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT km.kamar_id, km.status_kamar, km.no_kamar, k.status_verifikasi AS status_kos, k.nama_kos
           FROM kamar km JOIN kos k ON k.kos_id = km.kos_id
          WHERE km.kamar_id = $1
          FOR UPDATE OF km`,
        [kamarId]
      );
      if (!rows.length) throw new AppError(404, 'Kamar tidak ditemukan.');
      const kamar = rows[0];
      if (kamar.status_kos !== 'Aktif') throw new AppError(404, 'Kos tidak ditemukan atau tidak aktif.');
      if (kamar.status_kamar !== 'Kosong') throw new AppError(409, 'Kamar sudah dibooking.');
      const ins = await client.query(
        `INSERT INTO booking (kamar_id, user_id, tanggal_survey, status_booking)
         VALUES ($1, $2, $3, 'Menunggu') RETURNING *`,
        [kamarId, req.user.user_id, tanggal]
      );
      const statusKamar = await syncRoomStatus(client, kamarId);
      return { ...ins.rows[0], status_kamar: statusKamar, nama_kos: kamar.nama_kos, no_kamar: kamar.no_kamar };
    });
    return created(res, booking, 'Booking berhasil diajukan. Menunggu persetujuan pemilik kos.');
  } catch (err) {
    if (err.code === '23505') throw new AppError(409, 'Kamar sudah dibooking.');
    throw err;
  }
}

async function myBookings(req, res) {
  await autoSelesaiSafe();
  const { rows } = await query(
    `SELECT b.booking_id, b.tanggal_survey, b.status_booking, b.dibuat_pada,
            km.kamar_id, km.no_kamar, km.tipe_kamar, km.harga, km.status_kamar,
            k.kos_id, k.nama_kos, k.alamat, k.status_verifikasi AS status_kos,
            o.nama AS nama_pemilik, o.no_wa AS no_wa_pemilik,
            r.review_id, r.rating, r.komentar,
            (b.status_booking = 'Selesai' AND r.review_id IS NULL) AS bisa_review
       FROM booking b
       JOIN kamar km ON km.kamar_id = b.kamar_id
       JOIN kos k ON k.kos_id = km.kos_id
       JOIN "user" o ON o.user_id = k.owner_id
       LEFT JOIN review r ON r.booking_id = b.booking_id
      WHERE b.user_id = $1
      ORDER BY b.dibuat_pada DESC`,
    [req.user.user_id]
  );
  return ok(res, rows);
}

// ======================== REVIEW ========================
async function createReview(req, res) {
  const { rating, komentar } = req.body;
  const review = await withTransaction(async (client) => {
    const { rows } = await client.query(
      'SELECT booking_id, user_id, status_booking FROM booking WHERE booking_id = $1 FOR UPDATE',
      [req.params.id]
    );
    if (!rows.length) throw new AppError(404, 'Booking tidak ditemukan.');
    const bk = rows[0];
    if (bk.user_id !== req.user.user_id) throw new AppError(403, 'Anda hanya dapat mereview booking milik Anda.');
    if (bk.status_booking !== 'Selesai') {
      throw new AppError(403, 'Review hanya dapat diberikan setelah booking berstatus Selesai.');
    }
    const exists = await client.query('SELECT 1 FROM review WHERE booking_id = $1', [bk.booking_id]);
    if (exists.rowCount) throw new AppError(409, 'Booking ini sudah direview.');
    try {
      const ins = await client.query(
        'INSERT INTO review (booking_id, rating, komentar) VALUES ($1, $2, $3) RETURNING *',
        [bk.booking_id, rating, komentar]
      );
      return ins.rows[0];
    } catch (err) {
      if (err.code === '23505') throw new AppError(409, 'Booking ini sudah direview.');
      throw err;
    }
  });
  return created(res, review, 'Terima kasih! Review Anda berhasil dikirim.');
}

module.exports = { searchKos, detailKos, createBooking, myBookings, createReview };
