const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../utils/http');
const { validate, idParam, z } = require('../utils/validate');
const admin = require('../controllers/adminController');
const fasilitas = require('../controllers/fasilitasController');

const router = express.Router();

const fasilitasBody = z.object({
  nama_fasilitas: z
    .string({ required_error: 'Nama fasilitas wajib diisi.', invalid_type_error: 'Nama fasilitas tidak valid.' })
    .trim()
    .min(2, 'Nama fasilitas minimal 2 karakter.')
    .max(100, 'Nama fasilitas maksimal 100 karakter.'),
});

// ---------- Admin ----------
router.get(
  '/admin/owners',
  authenticate,
  authorize('Admin'),
  validate({
    query: z.object({
      status: z
        .enum(['Menunggu', 'Terverifikasi'], { errorMap: () => ({ message: 'Status harus Menunggu atau Terverifikasi.' }) })
        .optional()
        .or(z.literal('').transform(() => undefined)),
    }),
  }),
  asyncHandler(admin.listOwners)
);
router.patch(
  '/admin/owners/:id/verifikasi',
  authenticate,
  authorize('Admin'),
  validate({
    params: idParam,
    body: z.object({
      status: z.enum(['Menunggu', 'Terverifikasi'], {
        errorMap: () => ({ message: 'Status harus Menunggu atau Terverifikasi.' }),
      }),
    }),
  }),
  asyncHandler(admin.verifikasiOwner)
);
router.get('/admin/dashboard', authenticate, authorize('Admin'), asyncHandler(admin.dashboard));

// ---------- Master fasilitas ----------
router.get('/fasilitas', authenticate, asyncHandler(fasilitas.list));
router.post('/fasilitas', authenticate, authorize('Admin'), validate({ body: fasilitasBody }), asyncHandler(fasilitas.create));
router.put(
  '/fasilitas/:id',
  authenticate,
  authorize('Admin'),
  validate({ params: idParam, body: fasilitasBody }),
  asyncHandler(fasilitas.update)
);
router.delete('/fasilitas/:id', authenticate, authorize('Admin'), validate({ params: idParam }), asyncHandler(fasilitas.remove));

module.exports = router;
