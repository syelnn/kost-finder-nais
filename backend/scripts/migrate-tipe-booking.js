/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

async function main() {
  const sqlPath = path.resolve(__dirname, '../../database/migrations/001_add_tipe_booking.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log('[MIGRATE] Menjalankan:', sqlPath);
  await pool.query(sql);
  console.log('[MIGRATE] Selesai! Kolom tipe_booking & kos_id pada tabel booking siap digunakan.');
}

main()
  .catch((err) => {
    console.error('[MIGRATE] Gagal:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
