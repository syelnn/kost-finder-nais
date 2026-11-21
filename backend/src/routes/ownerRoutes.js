const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadFotoKos } = require('../middleware/upload');
const { asyncHandler } = require('../utils/http');
const { validate, idParam, z, req: r } = require('../utils/validate');
const ctrl = require('../controllers/ownerController');

const router = express.Router();
router.use('/owner', authenticate, authorize('Owner'));

const fasilitasArray = z
  .array(z.coerce.number().int().positive('ID fasilitas tidak valid.'), { invalid_type_error: 'Fasilitas harus berupa daftar.' })
  .max(100);

const kosBody = z.object({
  nama_kos: z.string(r('Nama kos')).trim().min(3, 'Nama kos minimal 3 karakter.').max(100, 'Nama kos maksimal 100 karakter.'),
  alamat: z
    .string(r('Alamat'))
    .trim()
    .min(10, 'Alamat minimal 10 karakter.')
    .max(500, 'Alamat maksimal 500 karakter.')
    .refine((v) => {
      const seg = v.split(',').map((s) => s.trim());
      return seg.length >= 3 && seg.every((s) => s.length > 0);
    }, 'Format alamat: "Jalan, Kecamatan, Kota/Kabupaten" (minimal 2 koma).'),
  latitude: z.coerce
    .number({ required_error: 'Titik lokasi wajib dipilih di peta.', invalid_type_error: 'Titik lokasi wajib dipilih di peta.' })
    .min(-90, 'Latitude tidak valid.')
    .max(90, 'Latitude tidak valid.'),
  longitude: z.coerce
    .number({ required_error: 'Titik lokasi wajib dipilih di peta.', invalid_type_error: 'Titik lokasi wajib dipilih di peta.' })
    .min(-180, 'Longitude tidak valid.')
    .max(180, 'Longitude tidak valid.'),
  tipe_kos: z.enum(['Putra', 'Putri', 'Campur'], { errorMap: () => ({ message: 'Tipe kos harus Putra, Putri, atau Campur.' }) }),
  fasilitas: fasilitasArray.optional(),
});

// z.coerce.number mengubah null/'' menjadi 0 -> tolak eksplisit agar kos tidak tersimpan tanpa titik
const kosBodyStrict = z
  .any()
  .superRefine((v, ctx) => {
    if (v && (v.latitude === null || v.latitude === '' || v.latitude === undefined)) {
      ctx.addIssue({ code: 'custom', path: ['latitude'], message: 'Titik lokasi wajib dipilih di peta.' });
    }
    if (v && (v.longitude === null || v.longitude === '' || v.longitude === undefined)) {
      ctx.addIssue({ code: 'custom', path: ['longitude'], message: 'Titik lokasi wajib dipilih di peta.' });
    }
  })
  .pipe(kosBody);

const kamarBody = z.object({
  no_kamar: z.string(r('Nomor kamar')).trim().min(1, 'Nomor kamar wajib diisi.').max(20, 'Nomor kamar maksimal 20 karakter.'),
  tipe_kamar: z.string(r('Tipe kamar')).trim().min(2, 'Tipe kamar minimal 2 karakter.').max(50, 'Tipe kamar maksimal 50 karakter.'),
  harga: z.coerce
    .number({ required_error: 'Harga wajib diisi.', invalid_type_error: 'Harga harus berupa angka.' })
    .int('Harga harus bilangan bulat.')
    .min(0, 'Harga tidak boleh negatif.')
    .max(2000000000, 'Harga terlalu besar.'),
  status_kamar: z
    .enum(['Kosong', 'Terisi'], { errorMap: () => ({ message: 'Status manual hanya boleh Kosong atau Terisi.' }) })
    .optional(),
});

const optionalEnum = (values, msg) =>
  z.preprocess((v) => (v === '' ? undefined : v), z.enum(values, { errorMap: () => ({ message: msg }) }).optional());

// Kos
router.get('/owner/kos', asyncHandler(ctrl.listKos));
router.post('/owner/kos', validate({ body: kosBodyStrict }), asyncHandler(ctrl.createKos));
router.get('/owner/kos/:id', validate({ params: idParam }), asyncHandler(ctrl.detailKos));
router.put('/owner/kos/:id', validate({ params: idParam, body: kosBodyStrict }), asyncHandler(ctrl.updateKos));
router.delete('/owner/kos/:id', validate({ params: idParam }), asyncHandler(ctrl.deleteKos));
router.patch(
  '/owner/kos/:id/status',
  validate({
    params: idParam,
    body: z.object({ status: z.enum(['Aktif', 'Nonaktif'], { errorMap: () => ({ message: 'Status harus Aktif atau Nonaktif.' }) }) }),
  }),
  asyncHandler(ctrl.setStatusKos)
);
router.put(
  '/owner/kos/:id/fasilitas',
  validate({ params: idParam, body: z.object({ fasilitas: fasilitasArray }) }),
  asyncHandler(ctrl.setFasilitas)
);

// Foto
router.post(
  '/owner/kos/:id/foto',
  validate({ params: idParam }),
  (req, res, next) => uploadFotoKos(req, res, (err) => next(err)),
  asyncHandler(ctrl.uploadFoto)
);
router.delete('/owner/foto/:id', validate({ params: idParam }), asyncHandler(ctrl.deleteFoto));

// Kamar
router.get('/owner/kos/:id/kamar', validate({ params: idParam }), asyncHandler(ctrl.listKamar));
router.post('/owner/kos/:id/kamar', validate({ params: idParam, body: kamarBody }), asyncHandler(ctrl.createKamar));
router.put('/owner/kamar/:id', validate({ params: idParam, body: kamarBody }), asyncHandler(ctrl.updateKamar));
router.delete('/owner/kamar/:id', validate({ params: idParam }), asyncHandler(ctrl.deleteKamar));

// Booking
router.get(
  '/owner/booking',
  validate({
    query: z.object({
      status: optionalEnum(['Menunggu', 'Disetujui', 'Ditolak', 'Selesai'], 'Status booking tidak valid.'),
      tipe: optionalEnum(['survey', 'sewa'], 'Jenis booking tidak valid.'),
      kos_id: z.preprocess((v) => (v === '' ? undefined : v), z.coerce.number().int().positive('Kos tidak valid.').optional()),
    }),
  }),
  asyncHandler(ctrl.listBooking)
);
router.patch('/owner/booking/:id/setujui', validate({ params: idParam }), asyncHandler(ctrl.setujuiBooking));
router.patch('/owner/booking/:id/tolak', validate({ params: idParam }), asyncHandler(ctrl.tolakBooking));
router.patch('/owner/booking/:id/selesai', validate({ params: idParam }), asyncHandler(ctrl.selesaiBooking));

// Dashboard
router.get('/owner/dashboard', asyncHandler(ctrl.dashboard));

module.exports = router;
