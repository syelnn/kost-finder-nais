const env = require('./config/env');
const cron = require('node-cron');
const app = require('./app');
const { testConnection, pool } = require('./config/db');
const { autoSelesaiSafe } = require('./services/bookingService');

async function start() {
  if (!env.DATABASE_URL) {
    console.error('[DB] DATABASE_URL belum diisi. Salin backend/.env.example menjadi backend/.env lalu isi connection string Supabase.');
    process.exit(1);
  }
  try {
    await testConnection();
    console.log('[DB] Koneksi PostgreSQL (Supabase) berhasil (SELECT 1).');
  } catch (err) {
    console.error('[DB] Gagal terhubung ke database:', err.message);
    console.error('     Periksa DATABASE_URL, password database, dan pastikan memakai Session pooler / Direct connection Supabase.');
    process.exit(1);
  }

  const n = await autoSelesaiSafe();
  if (n) console.log(`[AUTO-SELESAI] ${n} booking ditandai Selesai saat start.`);

  // Setiap jam pada menit ke-0 (zona Asia/Jakarta)
  cron.schedule(
    '0 * * * *',
    async () => {
      const count = await autoSelesaiSafe();
      if (count) console.log(`[AUTO-SELESAI] ${count} booking ditandai Selesai.`);
    },
    { timezone: 'Asia/Jakarta' }
  );

  const server = app.listen(env.PORT, () => {
    console.log(`[SERVER] Kos Finder API berjalan di http://localhost:${env.PORT}`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[SERVER] Port ${env.PORT} sudah dipakai. Hentikan proses lain atau ubah PORT di .env.`);
    } else {
      console.error('[SERVER]', err.message);
    }
    process.exit(1);
  });

  const shutdown = () => {
    server.close(() => pool.end().finally(() => process.exit(0)));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
