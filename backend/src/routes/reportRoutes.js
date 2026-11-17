const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../utils/http');
const { validate, z } = require('../utils/validate');
const ctrl = require('../controllers/reportController');

const router = express.Router();

const opt = (schema) => z.preprocess((v) => (v === '' || v === null ? undefined : v), schema.optional());

const filterQuery = z.object({
  wilayah: opt(z.string().trim().max(200, 'Wilayah terlalu panjang.')),
  tipeKos: opt(z.enum(['Putra', 'Putri', 'Campur'], { errorMap: () => ({ message: 'Tipe kos tidak valid.' }) })),
  statusBooking: opt(
    z.enum(['Menunggu', 'Disetujui', 'Ditolak', 'Selesai'], { errorMap: () => ({ message: 'Status booking tidak valid.' }) })
  ),
});

const guard = [authenticate, authorize('Admin', 'Owner')];

router.get('/laporan', ...guard, validate({ query: filterQuery }), asyncHandler(ctrl.laporan));
router.get('/export/:jenis.:format', ...guard, validate({ query: filterQuery }), asyncHandler(ctrl.exportData));
router.get('/backup/xlsx', ...guard, asyncHandler(ctrl.backupXlsx));
router.get('/backup/csv/:tabel', ...guard, asyncHandler(ctrl.backupCsv));

module.exports = router;
