const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

process.env.TZ = process.env.TZ || 'Asia/Jakarta';

const env = {
  DATABASE_URL: process.env.DATABASE_URL || '',
  DB_SSL: String(process.env.DB_SSL || 'true').toLowerCase() !== 'false',
  JWT_SECRET: process.env.JWT_SECRET || 'kos-finder-dev-secret-ganti-di-env',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  CLIENT_ORIGIN: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  PORT: Number(process.env.PORT) || 5000,
  TZ: process.env.TZ,
  UPLOAD_DIR: path.join(__dirname, '..', '..', 'uploads'),
  ASSET_DIR: path.join(__dirname, '..', '..', 'assets'),
};

module.exports = env;
