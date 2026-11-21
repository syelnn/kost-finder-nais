const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../utils/http');
const { validate, idParam, z, optionalText } = require('../utils/validate');
const ctrl = require('../controllers/userController');
const bukti = require('../controllers/buktiController');

const router = express.Router();

const emptyToUndef = (schema) => z.preprocess((v) => (v === '' || v === null ? undefined : v), schema);

const searchQuery = z
  .object({
    lat: emptyToUndef(z.coerce.number({ invalid_type_error: 'Latitude tidak valid.' }).min(-90).max(90).optional()),
    lng: emptyToUndef(z.coerce.number({ invalid_type_error: 'Longitude tidak valid.' }).min(-180).max(180).optional()),
    radius: emptyToUndef(
      z.coerce.number({ invalid_type_error: 'Radius tidak valid.' }).min(0.1, 'Radius minimal 0,1 km.').max(100, 'Radius maksimal 100 km.').optional()
    ),
    q: emptyToUndef(z.string({ invalid_type_error: 'Kata kunci tidak valid.' }).trim().max(100, 'Kata kunci maksimal 100 karakter.').optional()),
    hargaMin: emptyToUndef(z.coerce.number({ invalid_type_error: 'Harga minimum tidak valid.' }).int().min(0, 'Harga minimum tidak boleh negatif.').optional()),
    hargaMax: emptyToUndef(z.coerce.number({ invalid_type_error: 'Harga maksimum tidak valid.' }).int().min(0, 'Harga maksimum tidak boleh negatif.').optional()),
    fasilitas: emptyToUndef(
      z
        .string()
        .regex(/^\d+(,\d+)*$/, 'Format fasilitas harus berupa ID dipisah koma, mis. 1,2.')
        .transform((v) => [...new Set(v.split(',').map(Number))])
        .optional()
    ),
    tipe: emptyToUndef(z.enum(['Putra', 'Putri', 'Campur'], { errorMap: () => ({ message: 'Tipe kos tidak valid.' }) }).optional()),
  })
  .superRefine((v, ctx) => {
    if ((v.lat === undefined) !== (v.lng === undefined)) {
      ctx.addIssue({ code: 'custom', path: ['lat'], message: 'Latitude dan longitude harus diisi bersamaan.' });
    }
    if (v.hargaMin !== undefined && v.hargaMax !== undefined && v.hargaMin > v.hargaMax) {
      ctx.addIssue({ code: 'custom', path: ['hargaMax'], message: 'Harga maksimum harus lebih besar dari harga minimum.' });
    }
  });

const bookingBody = z
  .object({
    tipe_booking: emptyToUndef(
      z.enum(['survey', 'sewa'], { errorMap: () => ({ message: 'Jenis booking harus survey atau sewa.' }) }).optional()
    ).default('sewa'),
    kos_id: emptyToUndef(
      z.coerce
        .number({ invalid_type_error: 'Kos tidak valid.' })
        .int()
        .positive('Kos tidak valid.')
        .optional()
    ),
    kamar_id: emptyToUndef(
      z.coerce
        .number({ invalid_type_error: 'Kamar tidak valid.' })
        .int()
        .positive('Kamar tidak valid.')
        .optional()
    ),
    tanggal_survey: z
      .string({ required_error: 'Tanggal wajib diisi.', invalid_type_error: 'Tanggal tidak valid.' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD.')
      .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v), 'Tanggal tidak valid.'),
  })
  .superRefine((v, ctx) => {
    if (v.tipe_booking === 'sewa' && !v.kamar_id) {
      ctx.addIssue({ code: 'custom', path: ['kamar_id'], message: 'Kamar wajib dipilih untuk booking kamar.' });
    }
    if (v.tipe_booking === 'survey' && !v.kos_id && !v.kamar_id) {
      ctx.addIssue({ code: 'custom', path: ['kos_id'], message: 'Kos wajib dipilih untuk booking survey.' });
    }
  });

const reviewBody = z.object({
  rating: z.coerce
    .number({ required_error: 'Rating wajib diisi.', invalid_type_error: 'Rating wajib diisi.' })
    .int('Rating harus bilangan bulat.')
    .min(1, 'Rating minimal 1 bintang.')
    .max(5, 'Rating maksimal 5 bintang.'),
  komentar: optionalText(1000, 'Komentar'),
});

// Daftar kos Aktif untuk landing page (tamu belum login). Hanya baca; data sama dengan GET /kos.
// Harus didaftarkan SEBELUM '/kos/:id' agar "publik" tidak dibaca sebagai id.
router.get('/kos/publik', validate({ query: searchQuery }), asyncHandler(ctrl.searchKos));
router.get('/kos', authenticate, authorize('User'), validate({ query: searchQuery }), asyncHandler(ctrl.searchKos));
// Detail kos Aktif dapat dilihat publik (tamu, User, Owner, Admin). Booking & review tetap wajib token User.
router.get('/kos/:id', validate({ params: idParam }), asyncHandler(ctrl.detailKos));
router.post('/booking', authenticate, authorize('User'), validate({ body: bookingBody }), asyncHandler(ctrl.createBooking));
router.get('/booking/saya', authenticate, authorize('User'), asyncHandler(ctrl.myBookings));
router.get('/review/saya', authenticate, authorize('User'), asyncHandler(ctrl.myReviews));
router.post(
  '/booking/:id/review',
  authenticate,
  authorize('User'),
  validate({ params: idParam, body: reviewBody }),
  asyncHandler(ctrl.createReview)
);
router.get('/booking/:id/bukti', authenticate, authorize('Owner', 'User'), validate({ params: idParam }), asyncHandler(bukti.buktiBooking));

module.exports = router;
