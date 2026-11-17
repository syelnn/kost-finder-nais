const { Pool, types } = require('pg');
const env = require('./env');

// NUMERIC (latitude, longitude, rata_rating) -> number
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));
// BIGINT (hasil count/sum) -> number
types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));
// DATE -> string 'YYYY-MM-DD' apa adanya (hindari pergeseran zona waktu)
types.setTypeParser(1082, (v) => v);

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

pool.on('error', (err) => {
  console.error('[DB] Kesalahan koneksi idle:', err.message);
});

/** Jalankan query parameterized. */
function query(text, params) {
  return pool.query(text, params);
}

/** Jalankan fn(client) di dalam satu transaksi. */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {
      /* abaikan error rollback */
    }
    throw err;
  } finally {
    client.release();
  }
}

/** Tes koneksi saat server start. */
async function testConnection() {
  const { rows } = await pool.query('SELECT 1 AS ok');
  return rows[0].ok === 1;
}

module.exports = { pool, query, withTransaction, testConnection };
