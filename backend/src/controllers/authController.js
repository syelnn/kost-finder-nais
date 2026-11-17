const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { query } = require('../config/db');
const { AppError, ok, created } = require('../utils/http');

const PUBLIC_COLS = 'user_id, nama, email, role, no_wa, status_verifikasi';

function signToken(user) {
  return jwt.sign({ user_id: user.user_id, role: user.role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

async function register(req, res) {
  const { nama, email, password, no_wa, role } = req.body;
  const exists = await query('SELECT 1 FROM "user" WHERE lower(email) = lower($1)', [email]);
  if (exists.rowCount) {
    throw new AppError(409, 'Email sudah terdaftar.', { email: 'Email sudah terdaftar.' });
  }
  const hash = await bcrypt.hash(password, 10);
  const status = role === 'Owner' ? 'Menunggu' : 'Terverifikasi';
  let rows;
  try {
    ({ rows } = await query(
      `INSERT INTO "user" (nama, email, password, role, no_wa, status_verifikasi)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${PUBLIC_COLS}`,
      [nama, email, hash, role, no_wa, status]
    ));
  } catch (err) {
    if (err.code === '23505') throw new AppError(409, 'Email sudah terdaftar.', { email: 'Email sudah terdaftar.' });
    throw err;
  }
  const user = rows[0];
  const message =
    role === 'Owner'
      ? 'Registrasi berhasil. Akun Pemilik Kos Anda menunggu verifikasi Admin.'
      : 'Registrasi berhasil. Selamat datang di Kos Finder!';
  return created(res, { token: signToken(user), user }, message);
}

async function login(req, res) {
  const { email, password } = req.body;
  const { rows } = await query(`SELECT ${PUBLIC_COLS}, password FROM "user" WHERE lower(email) = lower($1)`, [email]);
  const found = rows[0];
  const valid = found ? await bcrypt.compare(password, found.password) : false;
  if (!valid) throw new AppError(401, 'Email atau password salah.');
  const { password: _omit, ...user } = found;
  return ok(res, { token: signToken(user), user }, 'Login berhasil.');
}

async function me(req, res) {
  return ok(res, req.user);
}

module.exports = { register, login, me };
