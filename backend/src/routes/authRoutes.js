const express = require('express');
const rateLimit = require('express-rate-limit');
const { validate, z, req: r, optionalText } = require('../utils/validate');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../utils/http');
const ctrl = require('../controllers/authController');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' },
});

const registerSchema = z.object({
  nama: z.string(r('Nama')).trim().min(3, 'Nama minimal 3 karakter.').max(100, 'Nama maksimal 100 karakter.'),
  email: z
    .string(r('Email'))
    .trim()
    .min(1, 'Email wajib diisi.')
    .max(100, 'Email maksimal 100 karakter.')
    .email('Format email tidak valid.')
    .transform((v) => v.toLowerCase()),
  password: z.string(r('Password')).min(8, 'Password minimal 8 karakter.').max(72, 'Password maksimal 72 karakter.'),
  no_wa: optionalText(20, 'Nomor WhatsApp').refine(
    (v) => v === null || /^(\+62|62|0)8[1-9][0-9]{6,11}$/.test(v.replace(/[\s-]/g, '')),
    'Format nomor WhatsApp tidak valid (contoh: 081234567890).'
  ).transform((v) => (v === null ? null : v.replace(/[\s-]/g, ''))),
  role: z.enum(['User', 'Owner'], {
    required_error: 'Peran wajib dipilih.',
    invalid_type_error: 'Peran harus User (Pencari Kos) atau Owner (Pemilik Kos).',
  }),
});

const loginSchema = z.object({
  email: z.string(r('Email')).trim().min(1, 'Email wajib diisi.').email('Format email tidak valid.'),
  password: z.string(r('Password')).min(1, 'Password wajib diisi.'),
});

router.post('/register', validate({ body: registerSchema }), asyncHandler(ctrl.register));
router.post('/login', loginLimiter, validate({ body: loginSchema }), asyncHandler(ctrl.login));
router.get('/me', authenticate, asyncHandler(ctrl.me));

module.exports = router;
