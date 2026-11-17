const { query } = require('../config/db');
const { BULAN_ID } = require('../utils/format');

/**
 * Deret bulanan N bulan terakhir (bulan tanpa data = 0), zona WIB, dikelompokkan berdasarkan booking.dibuat_pada.
 * @param {number} n jumlah bulan
 * @param {string} aggExpr ekspresi agregat (mis. 'COUNT(b.booking_id)')
 * @param {string} fromJoin sumber data yang memuat alias b (booking)
 * @param {string} extraWhere kondisi tambahan diawali 'AND ...' memakai parameter mulai $1
 * @param {Array} params parameter untuk extraWhere
 */
async function monthSeries(n, aggExpr, fromJoin, extraWhere, params) {
  const { rows } = await query(
    `WITH bulan AS (
        SELECT generate_series(
          date_trunc('month', now() AT TIME ZONE 'Asia/Jakarta') - interval '${Number(n) - 1} months',
          date_trunc('month', now() AT TIME ZONE 'Asia/Jakarta'),
          interval '1 month'
        ) AS awal
     ), data AS (
        SELECT date_trunc('month', b.dibuat_pada AT TIME ZONE 'Asia/Jakarta') AS awal, ${aggExpr} AS nilai
          FROM ${fromJoin}
         WHERE b.dibuat_pada AT TIME ZONE 'Asia/Jakarta' >= date_trunc('month', now() AT TIME ZONE 'Asia/Jakarta') - interval '${Number(n) - 1} months'
           ${extraWhere}
         GROUP BY 1
     )
     SELECT EXTRACT(YEAR FROM bulan.awal)::int AS tahun, EXTRACT(MONTH FROM bulan.awal)::int AS bulan,
            COALESCE(data.nilai, 0)::bigint AS nilai
       FROM bulan LEFT JOIN data ON data.awal = bulan.awal
      ORDER BY bulan.awal`,
    params
  );
  return {
    labels: rows.map((r) => `${BULAN_ID[r.bulan - 1].slice(0, 3)} ${r.tahun}`),
    data: rows.map((r) => Number(r.nilai)),
  };
}

module.exports = { monthSeries };
