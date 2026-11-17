const BULAN_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function rupiah(n) {
  if (n === null || n === undefined || n === '') return '-';
  return `Rp ${Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

/** 'YYYY-MM-DD' atau Date -> 'DD MMMM YYYY' */
function tanggalId(value) {
  if (!value) return '-';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return `${String(d).padStart(2, '0')} ${BULAN_ID[m - 1]} ${y}`;
  }
  const date = value instanceof Date ? value : new Date(value);
  const s = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(date);
  return tanggalId(s);
}

function tanggalWaktuId(value) {
  const date = value ? new Date(value) : new Date();
  const time = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  return `${tanggalId(date)} ${time.replace('.', ':')} WIB`;
}

/** Tanggal hari ini WIB 'YYYY-MM-DD' */
function todayJakarta() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
}

module.exports = { rupiah, tanggalId, tanggalWaktuId, todayJakarta, BULAN_ID };
