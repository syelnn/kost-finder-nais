// Helper penulisan tanggal dalam kata (huruf kapital) untuk Bukti Konfirmasi Booking.
const SATUAN = ['', 'SATU', 'DUA', 'TIGA', 'EMPAT', 'LIMA', 'ENAM', 'TUJUH', 'DELAPAN', 'SEMBILAN', 'SEPULUH', 'SEBELAS'];
const HARI = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
const BULAN = [
  'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
  'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER',
];

/** Terbilang bilangan bulat >= 0 dalam huruf kapital. */
function terbilang(n) {
  n = Math.floor(Math.abs(Number(n)));
  if (n === 0) return 'NOL';
  const conv = (x) => {
    if (x < 12) return SATUAN[x];
    if (x < 20) return `${SATUAN[x - 10]} BELAS`;
    if (x < 100) return `${SATUAN[Math.floor(x / 10)]} PULUH${x % 10 ? ` ${SATUAN[x % 10]}` : ''}`;
    if (x < 200) return `SERATUS${x - 100 ? ` ${conv(x - 100)}` : ''}`;
    if (x < 1000) return `${SATUAN[Math.floor(x / 100)]} RATUS${x % 100 ? ` ${conv(x % 100)}` : ''}`;
    if (x < 2000) return `SERIBU${x - 1000 ? ` ${conv(x - 1000)}` : ''}`;
    if (x < 1000000) return `${conv(Math.floor(x / 1000))} RIBU${x % 1000 ? ` ${conv(x % 1000)}` : ''}`;
    if (x < 1000000000) return `${conv(Math.floor(x / 1000000))} JUTA${x % 1000000 ? ` ${conv(x % 1000000)}` : ''}`;
    return `${conv(Math.floor(x / 1000000000))} MILIAR${x % 1000000000 ? ` ${conv(x % 1000000000)}` : ''}`;
  };
  return conv(n).replace(/\s+/g, ' ').trim();
}

/** Komponen tanggal saat ini di zona Asia/Jakarta. */
function nowJakartaParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const weekdayIdx = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: weekdayIdx,
  };
}

/** { hari, tanggal, bulan, tahun } dalam huruf kapital (WIB). */
function tanggalDalamKata(date = new Date()) {
  const p = nowJakartaParts(date);
  return {
    hari: HARI[p.weekday],
    tanggal: terbilang(p.day),
    bulan: BULAN[p.month - 1],
    tahun: terbilang(p.year),
  };
}

module.exports = { terbilang, tanggalDalamKata, nowJakartaParts, BULAN, HARI };
