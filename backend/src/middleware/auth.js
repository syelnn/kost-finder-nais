const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { query } = require('../config/db');
const { AppError } = require('../utils/http');

/** Wajib login: verifikasi JWT Bearer lalu muat data user terbaru dari database. */
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new AppError(401, 'Silakan login terlebih dahulu.');
    }
    let payload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET);
    } catch (e) {
      throw new AppError(
        401,
        e.name === 'TokenExpiredError' ? 'Sesi Anda telah berakhir. Silakan login kembali.' : 'Token tidak valid.'
      );
    }
    const { rows } = await query(
      'SELECT user_id, nama, email, role, no_wa, status_verifikasi FROM "user" WHERE user_id = $1',
      [payload.user_id]
    );
    if (!rows.length) throw new AppError(401, 'Akun tidak ditemukan. Silakan login kembali.');
    req.user = rows[0];
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Batasi akses berdasarkan peran. */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new AppError(401, 'Silakan login terlebih dahulu.'));
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'Anda tidak memiliki hak akses ke fitur ini.'));
    }
    return next();
  };
}

module.exports = { authenticate, authorize };
