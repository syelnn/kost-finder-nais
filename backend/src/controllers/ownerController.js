const { query, withTransaction } = require('../config/db');
const { AppError, ok, created } = require('../utils/http');
const { isRealImage, removeFiles, removeRelative } = require('../middleware/upload');
const { syncRoomStatus, autoSelesaiSafe } = require('../services/bookingService');
const { monthSeries } = require('../services/statsService');

const MAX_FOTO = 5;
const round7 = (n) => Math.round(Number(n) * 1e7) / 1e7;

/** Ambil kos dan pastikan milik owner yang login (anti-IDOR). */
async function getOwnedKos(kosId, ownerId, client) {
  const db = client || { query };
  const { rows } = await db.query('SELECT * FROM kos WHERE kos_id = $1', [kosId]);
  if (!rows.length) throw new AppError(404, 'Kos tidak ditemukan.');
  if (rows[0].owner_id !== ownerId) throw new AppError(403, 'Anda tidak berhak mengakses kos ini.');
  return rows[0];
}

async function getOwnedKamar(kamarId, ownerId, client) {
  const db = client || { query };
  const { rows } = await db.query(
    `SELECT km.*, k.owner_id FROM kamar km JOIN kos k ON k.kos_id = km.kos_id WHERE km.kamar_id = $1`,
    [kamarId]
  );
  if (!rows.length) throw new AppError(404, 'Kamar tidak ditemukan.');
  if (rows[0].owner_id !== ownerId) throw new AppError(403, 'Anda tidak berhak mengakses kamar ini.');
  return rows[0];
}

async function validFasilitasIds(client, ids) {
  if (!ids || !ids.length) return [];
  const unique = [...new Set(ids)];
  const { rows } = await client.query('SELECT fasilitas_id FROM fasilitas WHERE fasilitas_id = ANY($1::int[])', [unique]);
  if (rows.length !== unique.length) {
    throw new AppError(422, 'Ada fasilitas yang tidak dikenal.', { fasilitas: 'Ada fasilitas yang tidak dikenal.' });
  }
  return unique;
}

async function replaceFasilitas(client, kosId, ids) {
  const valid = await validFasilitasIds(client, ids);
  await client.query('DELETE FROM kos_fasilitas WHERE kos_id = $1', [kosId]);
  if (valid.length) {
    await client.query(
      'INSERT INTO kos_fasilitas (kos_id, fasilitas_id) SELECT $1, unnest($2::int[])',
      [kosId, valid]
    );
  }
  return valid;
}

// ======================== KOS ========================
async function listKos(req, res) {
  const { rows } = await query(
    `SELECT v.*,
            (SELECT f.path_foto FROM foto_kos f WHERE f.kos_id = v.kos_id ORDER BY f.foto_id LIMIT 1) AS foto,
            (SELECT COUNT(*) FROM foto_kos f WHERE f.kos_id = v.kos_id)::int AS jumlah_foto,
            (SELECT COUNT(*) FROM booking b JOIN kamar km ON km.kamar_id = b.kamar_id
              WHERE km.kos_id = v.kos_id AND b.status_booking = 'Menunggu')::int AS booking_menunggu
       FROM v_kos_ringkas v
      WHERE v.owner_id = $1
      ORDER BY v.kos_id DESC`,
    [req.user.user_id]
  );
  return ok(res, rows);
}

async function detailKos(req, res) {
  const kos = await getOwnedKos(req.params.id, req.user.user_id);
  const [ringkas, foto, fasilitas, kamar] = await Promise.all([
    query('SELECT * FROM v_kos_ringkas WHERE kos_id = $1', [kos.kos_id]),
    query('SELECT foto_id, path_foto FROM foto_kos WHERE kos_id = $1 ORDER BY foto_id', [kos.kos_id]),
    query(
      `SELECT f.fasilitas_id, f.nama_fasilitas FROM kos_fasilitas kf
         JOIN fasilitas f ON f.fasilitas_id = kf.fasilitas_id
        WHERE kf.kos_id = $1 ORDER BY f.nama_fasilitas`,
      [kos.kos_id]
    ),
    query('SELECT * FROM kamar WHERE kos_id = $1 ORDER BY no_kamar', [kos.kos_id]),
  ]);
  return ok(res, { ...ringkas.rows[0], foto: foto.rows, fasilitas: fasilitas.rows, kamar: kamar.rows });
}

async function createKos(req, res) {
  const { nama_kos, alamat, latitude, longitude, tipe_kos, fasilitas } = req.body;
  const status = req.user.status_verifikasi === 'Terverifikasi' ? 'Aktif' : 'Menunggu';
  const kos = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO kos (owner_id, nama_kos, alamat, latitude, longitude, tipe_kos, status_verifikasi)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.user_id, nama_kos, alamat, round7(latitude), round7(longitude), tipe_kos, status]
    );
    await replaceFasilitas(client, rows[0].kos_id, fasilitas || []);
    return rows[0];
  });
  const message =
    status === 'Aktif'
      ? 'Kos berhasil ditambahkan dan langsung tampil di peta.'
      : 'Kos berhasil disimpan. Kos belum tampil di peta karena akun Anda menunggu verifikasi Admin.';
  return created(res, kos, message);
}

async function updateKos(req, res) {
  await getOwnedKos(req.params.id, req.user.user_id);
  const { nama_kos, alamat, latitude, longitude, tipe_kos, fasilitas } = req.body;
  const kos = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `UPDATE kos SET nama_kos = $2, alamat = $3, latitude = $4, longitude = $5, tipe_kos = $6
        WHERE kos_id = $1 RETURNING *`,
      [req.params.id, nama_kos, alamat, round7(latitude), round7(longitude), tipe_kos]
    );
    if (Array.isArray(fasilitas)) await replaceFasilitas(client, req.params.id, fasilitas);
    return rows[0];
  });
  return ok(res, kos, 'Data kos berhasil diperbarui.');
}

async function deleteKos(req, res) {
  const kos = await getOwnedKos(req.params.id, req.user.user_id);
  const foto = await query('SELECT path_foto FROM foto_kos WHERE kos_id = $1', [kos.kos_id]);
  await query('DELETE FROM kos WHERE kos_id = $1', [kos.kos_id]);
  foto.rows.forEach((f) => removeRelative(f.path_foto));
  return ok(res, null, `Kos "${kos.nama_kos}" beserta kamar, foto, dan booking terkait berhasil dihapus.`);
}

async function setStatusKos(req, res) {
  const kos = await getOwnedKos(req.params.id, req.user.user_id);
  if (req.user.status_verifikasi !== 'Terverifikasi') {
    throw new AppError(403, 'Akun Anda belum diverifikasi Admin. Kos belum dapat dipublikasikan.');
  }
  const { status } = req.body;
  const { rows } = await query('UPDATE kos SET status_verifikasi = $2 WHERE kos_id = $1 RETURNING *', [kos.kos_id, status]);
  return ok(
    res,
    rows[0],
    status === 'Aktif' ? `Kos "${kos.nama_kos}" dipublikasikan dan tampil di peta.` : `Kos "${kos.nama_kos}" dinonaktifkan.`
  );
}

async function setFasilitas(req, res) {
  await getOwnedKos(req.params.id, req.user.user_id);
  const ids = await withTransaction((client) => replaceFasilitas(client, req.params.id, req.body.fasilitas));
  return ok(res, { kos_id: Number(req.params.id), fasilitas: ids }, 'Fasilitas kos berhasil disimpan.');
}

// ======================== FOTO ========================
async function uploadFoto(req, res) {
  const files = req.files || [];
  try {
    await getOwnedKos(req.params.id, req.user.user_id);
    if (!files.length) {
      throw new AppError(422, 'Pilih minimal 1 foto.', { foto: 'Pilih minimal 1 foto.' });
    }
    for (const f of files) {
      if (!isRealImage(f.path)) {
        throw new AppError(422, `Berkas "${f.originalname}" bukan gambar yang valid.`, {
          foto: 'Berkas bukan gambar JPG/PNG/WEBP yang valid.',
        });
      }
    }
    const inserted = await withTransaction(async (client) => {
      await client.query('SELECT kos_id FROM kos WHERE kos_id = $1 FOR UPDATE', [req.params.id]);
      const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM foto_kos WHERE kos_id = $1', [req.params.id]);
      if (rows[0].n + files.length > MAX_FOTO) {
        throw new AppError(422, `Maksimal ${MAX_FOTO} foto per kos. Sisa slot: ${Math.max(0, MAX_FOTO - rows[0].n)}.`, {
          foto: `Maksimal ${MAX_FOTO} foto per kos.`,
        });
      }
      const out = [];
      for (const f of files) {
        const r = await client.query(
          'INSERT INTO foto_kos (kos_id, path_foto) VALUES ($1, $2) RETURNING foto_id, path_foto',
          [req.params.id, `kos/${f.filename}`]
        );
        out.push(r.rows[0]);
      }
      return out;
    });
    return created(res, inserted, `${inserted.length} foto berhasil diunggah.`);
  } catch (err) {
    removeFiles(files);
    throw err;
  }
}

async function deleteFoto(req, res) {
  const { rows } = await query(
    `SELECT f.foto_id, f.path_foto, k.owner_id FROM foto_kos f JOIN kos k ON k.kos_id = f.kos_id WHERE f.foto_id = $1`,
    [req.params.id]
  );
  if (!rows.length) throw new AppError(404, 'Foto tidak ditemukan.');
  if (rows[0].owner_id !== req.user.user_id) throw new AppError(403, 'Anda tidak berhak menghapus foto ini.');
  await query('DELETE FROM foto_kos WHERE foto_id = $1', [req.params.id]);
  removeRelative(rows[0].path_foto);
  return ok(res, null, 'Foto berhasil dihapus.');
}

// ======================== KAMAR ========================
async function listKamar(req, res) {
  const kos = await getOwnedKos(req.params.id, req.user.user_id);
  const { rows } = await query(
    `SELECT km.*,
            EXISTS (SELECT 1 FROM booking b WHERE b.kamar_id = km.kamar_id
                     AND b.status_booking IN ('Menunggu', 'Disetujui')) AS ada_booking_aktif
       FROM kamar km WHERE km.kos_id = $1
      ORDER BY km.no_kamar`,
    [kos.kos_id]
  );
  return ok(res, { kos: { kos_id: kos.kos_id, nama_kos: kos.nama_kos, status_verifikasi: kos.status_verifikasi }, kamar: rows });
}

function duplicateNoKamar(err) {
  if (err.code === '23505') {
    return new AppError(409, 'Nomor kamar sudah dipakai di kos ini.', { no_kamar: 'Nomor kamar sudah dipakai di kos ini.' });
  }
  return err;
}

async function createKamar(req, res) {
  const kos = await getOwnedKos(req.params.id, req.user.user_id);
  const { no_kamar, tipe_kamar, harga, status_kamar } = req.body;
  try {
    const { rows } = await query(
      `INSERT INTO kamar (kos_id, no_kamar, tipe_kamar, harga, status_kamar)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [kos.kos_id, no_kamar, tipe_kamar, harga, status_kamar || 'Kosong']
    );
    return created(res, { ...rows[0], ada_booking_aktif: false }, 'Kamar berhasil ditambahkan.');
  } catch (err) {
    throw duplicateNoKamar(err);
  }
}

async function updateKamar(req, res) {
  const { no_kamar, tipe_kamar, harga, status_kamar } = req.body;
  const kamar = await withTransaction(async (client) => {
    const current = await getOwnedKamar(req.params.id, req.user.user_id, client);
    await client.query('SELECT kamar_id FROM kamar WHERE kamar_id = $1 FOR UPDATE', [current.kamar_id]);
    let newStatus = current.status_kamar;
    if (status_kamar && status_kamar !== current.status_kamar) {
      const aktif = await client.query(
        `SELECT 1 FROM booking WHERE kamar_id = $1 AND status_booking IN ('Menunggu', 'Disetujui')`,
        [current.kamar_id]
      );
      if (current.status_kamar === 'Dalam Booking' || aktif.rowCount) {
        throw new AppError(409, 'Status kamar tidak dapat diubah manual karena kamar memiliki booking aktif.', {
          status_kamar: 'Kamar memiliki booking aktif; status diatur otomatis oleh sistem.',
        });
      }
      newStatus = status_kamar;
    }
    try {
      const { rows } = await client.query(
        `UPDATE kamar SET no_kamar = $2, tipe_kamar = $3, harga = $4, status_kamar = $5
          WHERE kamar_id = $1 RETURNING *`,
        [current.kamar_id, no_kamar, tipe_kamar, harga, newStatus]
      );
      return rows[0];
    } catch (err) {
      throw duplicateNoKamar(err);
    }
  });
  return ok(res, kamar, 'Data kamar berhasil diperbarui.');
}

async function deleteKamar(req, res) {
  const kamar = await getOwnedKamar(req.params.id, req.user.user_id);
  await query('DELETE FROM kamar WHERE kamar_id = $1', [kamar.kamar_id]);
  return ok(res, null, `Kamar No. ${kamar.no_kamar} berhasil dihapus.`);
}

// ======================== BOOKING ========================
async function listBooking(req, res) {
  await autoSelesaiSafe();
  const { status, kos_id: kosId } = req.validQuery;
  const params = [req.user.user_id];
  let where = 'WHERE k.owner_id = $1';
  if (status) {
    params.push(status);
    where += ` AND b.status_booking = $${params.length}`;
  }
  if (kosId) {
    params.push(kosId);
    where += ` AND k.kos_id = $${params.length}`;
  }
  const { rows } = await query(
    `SELECT b.booking_id, b.tanggal_survey, b.status_booking, b.dibuat_pada,
            km.kamar_id, km.no_kamar, km.tipe_kamar, km.harga, km.status_kamar,
            k.kos_id, k.nama_kos,
            u.user_id, u.nama AS nama_user, u.email AS email_user, u.no_wa AS no_wa_user,
            (r.review_id IS NOT NULL) AS sudah_review, r.rating
       FROM booking b
       JOIN kamar km ON km.kamar_id = b.kamar_id
       JOIN kos k ON k.kos_id = km.kos_id
       JOIN "user" u ON u.user_id = b.user_id
       LEFT JOIN review r ON r.booking_id = b.booking_id
       ${where}
      ORDER BY (b.status_booking = 'Menunggu') DESC, b.dibuat_pada DESC`,
    params
  );
  return ok(res, rows);
}

async function prosesBooking(req, res, statusBaru) {
  const result = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT b.booking_id, b.status_booking, b.kamar_id, k.owner_id
         FROM booking b
         JOIN kamar km ON km.kamar_id = b.kamar_id
         JOIN kos k ON k.kos_id = km.kos_id
        WHERE b.booking_id = $1
        FOR UPDATE OF b, km`,
      [req.params.id]
    );
    if (!rows.length) throw new AppError(404, 'Booking tidak ditemukan.');
    const bk = rows[0];
    if (bk.owner_id !== req.user.user_id) throw new AppError(403, 'Anda tidak berhak memproses booking ini.');
    if (bk.status_booking !== 'Menunggu') {
      throw new AppError(409, `Booking sudah berstatus ${bk.status_booking} dan tidak dapat diproses lagi.`);
    }
    const upd = await client.query(
      'UPDATE booking SET status_booking = $2 WHERE booking_id = $1 RETURNING *',
      [bk.booking_id, statusBaru]
    );
    const statusKamar = await syncRoomStatus(client, bk.kamar_id);
    return { ...upd.rows[0], status_kamar: statusKamar };
  });
  return ok(
    res,
    result,
    statusBaru === 'Disetujui' ? 'Booking disetujui. Status kamar menjadi Terisi.' : 'Booking ditolak. Status kamar kembali Kosong.'
  );
}

const setujuiBooking = (req, res) => prosesBooking(req, res, 'Disetujui');
const tolakBooking = (req, res) => prosesBooking(req, res, 'Ditolak');

// ======================== DASHBOARD ========================
async function dashboard(req, res) {
  await autoSelesaiSafe();
  const ownerId = req.user.user_id;
  const [kartu, statusKamar, perKos, pendapatan] = await Promise.all([
    query(
      `SELECT
         (SELECT COUNT(*) FROM kos WHERE owner_id = $1)::int AS total_kos,
         (SELECT COUNT(*) FROM kos WHERE owner_id = $1 AND status_verifikasi = 'Aktif')::int AS kos_aktif,
         (SELECT COUNT(*) FROM kamar km JOIN kos k ON k.kos_id = km.kos_id WHERE k.owner_id = $1)::int AS total_kamar,
         (SELECT COUNT(*) FROM kamar km JOIN kos k ON k.kos_id = km.kos_id
           WHERE k.owner_id = $1 AND km.status_kamar = 'Terisi')::int AS kamar_terisi,
         (SELECT COUNT(*) FROM booking b JOIN kamar km ON km.kamar_id = b.kamar_id JOIN kos k ON k.kos_id = km.kos_id
           WHERE k.owner_id = $1 AND b.status_booking = 'Menunggu')::int AS booking_menunggu,
         (SELECT COALESCE(SUM(km.harga), 0) FROM kamar km JOIN kos k ON k.kos_id = km.kos_id
           WHERE k.owner_id = $1 AND km.status_kamar = 'Terisi')::bigint AS potensi_pendapatan`,
      [ownerId]
    ),
    query(
      `SELECT km.status_kamar AS status, COUNT(*)::int AS jumlah
         FROM kamar km JOIN kos k ON k.kos_id = km.kos_id
        WHERE k.owner_id = $1 GROUP BY km.status_kamar`,
      [ownerId]
    ),
    query(
      `SELECT k.nama_kos, COUNT(km.kamar_id)::int AS total,
              COUNT(km.kamar_id) FILTER (WHERE km.status_kamar = 'Terisi')::int AS terisi
         FROM kos k LEFT JOIN kamar km ON km.kos_id = k.kos_id
        WHERE k.owner_id = $1 GROUP BY k.kos_id ORDER BY k.nama_kos`,
      [ownerId]
    ),
    monthSeries(
      6,
      'SUM(km.harga)',
      'booking b JOIN kamar km ON km.kamar_id = b.kamar_id JOIN kos k ON k.kos_id = km.kos_id',
      `AND k.owner_id = $1 AND b.status_booking IN ('Disetujui', 'Selesai')`,
      [ownerId]
    ),
  ]);
  const k = kartu.rows[0];
  const statuses = ['Kosong', 'Dalam Booking', 'Terisi'];
  return ok(res, {
    kartu: {
      ...k,
      potensi_pendapatan: Number(k.potensi_pendapatan),
      okupansi_persen: k.total_kamar ? Math.round((k.kamar_terisi / k.total_kamar) * 1000) / 10 : 0,
    },
    grafik: {
      statusKamar: { labels: statuses, data: statuses.map((s) => statusKamar.rows.find((r) => r.status === s)?.jumlah || 0) },
      okupansiPerKos: {
        labels: perKos.rows.map((r) => r.nama_kos),
        data: perKos.rows.map((r) => (r.total ? Math.round((r.terisi / r.total) * 1000) / 10 : 0)),
      },
      pendapatanPerBulan: pendapatan,
    },
  });
}

module.exports = {
  listKos,
  detailKos,
  createKos,
  updateKos,
  deleteKos,
  setStatusKos,
  setFasilitas,
  uploadFoto,
  deleteFoto,
  listKamar,
  createKamar,
  updateKamar,
  deleteKamar,
  listBooking,
  setujuiBooking,
  tolakBooking,
  dashboard,
  getOwnedKos,
};
