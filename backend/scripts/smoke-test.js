/* eslint-disable no-console */
/**
 * Smoke test end-to-end Kos Finder.
 * Jalankan saat server backend hidup:  npm run smoke
 * (opsional: API_URL=http://localhost:5000/api)
 * Membuat data uji baru setiap kali dijalankan lalu membersihkannya di akhir.
 */
const ExcelJS = require('exceljs');
const { pool } = require('../src/config/db');
const { autoSelesai } = require('../src/services/bookingService');

const BASE = (process.env.API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const ROOT = BASE.replace(/\/api$/, '');
const PASS = 'Password123!';
const TS = Date.now();
const results = { pass: 0, fail: 0 };

function check(name, cond, info) {
  if (cond) {
    results.pass += 1;
    console.log(`  \u2714 ${name}`);
  } else {
    results.fail += 1;
    console.log(`  \u2716 ${name}${info !== undefined ? `  -> ${typeof info === 'string' ? info : JSON.stringify(info).slice(0, 400)}` : ''}`);
  }
  return cond;
}

function section(title) {
  console.log(`\n\u25B6 ${title}`);
}

async function api(method, path, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  const type = res.headers.get('content-type') || '';
  const buffer = Buffer.from(await res.arrayBuffer());
  let json = null;
  if (type.includes('application/json')) {
    try {
      json = JSON.parse(buffer.toString('utf8'));
    } catch (e) {
      json = null;
    }
  }
  return { status: res.status, json, type, buffer, data: json && json.data };
}

const todayWIB = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
const addDays = (s, n) => {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

async function login(email, password = PASS) {
  const r = await api('POST', '/auth/login', { body: { email, password } });
  return r;
}

async function makePastAndFinish(bookingId) {
  await pool.query(`UPDATE booking SET tanggal_survey = (now() AT TIME ZONE 'Asia/Jakarta')::date - 1 WHERE booking_id = $1`, [bookingId]);
  return autoSelesai();
}

async function main() {
  console.log(`Kos Finder smoke test -> ${BASE}`);
  const health = await api('GET', '/health').catch(() => null);
  if (!health || health.status !== 200) {
    console.error('\u2716 Server tidak dapat dihubungi. Jalankan "npm run dev" terlebih dahulu.');
    process.exit(2);
  }

  // ---------------- 1. AUTENTIKASI ----------------
  section('1. Autentikasi');
  check('Tanpa token -> 401', (await api('GET', '/auth/me')).status === 401);
  check('Token tidak valid -> 401', (await api('GET', '/auth/me', { token: 'abc.def.ghi' })).status === 401);
  const wrong = await login('admin@kosfinder.id', 'salahbanget');
  check('Login password salah -> 401 + pesan generik', wrong.status === 401 && wrong.json.message === 'Email atau password salah.', wrong.json);
  const la = await login('admin@kosfinder.id');
  const lo = await login('owner1@kosfinder.id');
  const lo2 = await login('owner2@kosfinder.id');
  const lu = await login('user1@kosfinder.id');
  check('Login Admin -> 200', la.status === 200 && la.data.user.role === 'Admin', la.json);
  check('Login Owner -> 200', lo.status === 200 && lo.data.user.role === 'Owner', lo.json);
  check('Login User -> 200', lu.status === 200 && lu.data.user.role === 'User', lu.json);
  check('Respons login tidak memuat password', !JSON.stringify(la.json).includes('password'));
  const ADMIN = la.data.token;
  const OWNER1 = lo.data.token;
  const OWNER2 = lo2.data.token;
  const USER1 = lu.data.token;

  // ---------------- 2. HAK AKSES ----------------
  section('2. Hak akses lintas peran & IDOR');
  check('User -> /api/owner/kos = 403', (await api('GET', '/owner/kos', { token: USER1 })).status === 403);
  check('Owner -> /api/admin/owners = 403', (await api('GET', '/admin/owners', { token: OWNER1 })).status === 403);
  check('Admin -> /api/kos (peta) = 403', (await api('GET', '/kos', { token: ADMIN })).status === 403);
  const idor = await api('GET', '/owner/kos/1', { token: OWNER2 });
  check('Owner B akses kos Owner A -> 403/404', [403, 404].includes(idor.status), idor.status);
  const idorPut = await api('PUT', '/owner/kamar/1', { token: OWNER2, body: { no_kamar: 'X', tipe_kamar: 'Hack', harga: 1 } });
  check('Owner B ubah kamar Owner A -> 403/404', [403, 404].includes(idorPut.status), idorPut.status);
  check('User tulis fasilitas -> 403', (await api('POST', '/fasilitas', { token: USER1, body: { nama_fasilitas: 'X' } })).status === 403);

  // ---------------- 3. VERIFIKASI OWNER ----------------
  section('3. Owner Menunggu & verifikasi Admin');
  const regBad = await api('POST', '/auth/register', { body: { nama: 'A', email: 'bukan-email', password: '123', role: 'Admin' } });
  check('Register data tidak valid -> 422 + error per-field', regBad.status === 422 && regBad.json.errors && regBad.json.errors.email && regBad.json.errors.password, regBad.json);
  const ownerEmail = `smoke.owner.${TS}@test.local`;
  const regO = await api('POST', '/auth/register', {
    body: { nama: 'Smoke Owner', email: ownerEmail, password: PASS, no_wa: '081234567890', role: 'Owner' },
  });
  check('Register Owner -> 201 status Menunggu', regO.status === 201 && regO.data.user.status_verifikasi === 'Menunggu', regO.json);
  const dupe = await api('POST', '/auth/register', { body: { nama: 'Smoke Dupe', email: ownerEmail.toUpperCase(), password: PASS, role: 'User' } });
  check('Register email duplikat (beda huruf) -> 409', dupe.status === 409, dupe.status);
  let OWNER = regO.data.token;
  const ownerId = regO.data.user.user_id;

  const lat = -7.2 + (TS % 1000) / 100000;
  const lng = 108.0 + (TS % 777) / 100000;
  const wilayah = `Kabupaten Smoke ${TS}`;
  const kosBody = (over) => ({
    nama_kos: 'Kos Smoke Alpha',
    alamat: `Jl. Smoke No. 1, Kecamatan Uji, ${wilayah}`,
    latitude: lat,
    longitude: lng,
    tipe_kos: 'Putri',
    fasilitas: [1],
    ...over,
  });
  const noTitik = await api('POST', '/owner/kos', { token: OWNER, body: kosBody({ latitude: null, longitude: null }) });
  check('Kos tanpa titik lokasi -> 422', noTitik.status === 422 && noTitik.json.errors.latitude, noTitik.json);
  const badAlamat = await api('POST', '/owner/kos', { token: OWNER, body: kosBody({ alamat: 'Jalan tanpa koma sama sekali' }) });
  check('Alamat tanpa format 2 koma -> 422', badAlamat.status === 422 && badAlamat.json.errors.alamat, badAlamat.json);
  const kosPending = await api('POST', '/owner/kos', { token: OWNER, body: kosBody({ nama_kos: 'Kos Smoke Pending' }) });
  check('Owner Menunggu buat kos -> 201 status Menunggu', kosPending.status === 201 && kosPending.data.status_verifikasi === 'Menunggu', kosPending.json);
  const pendingId = kosPending.data.kos_id;
  const tryAct = await api('PATCH', `/owner/kos/${pendingId}/status`, { token: OWNER, body: { status: 'Aktif' } });
  check('Owner Menunggu aktifkan kos -> 403', tryAct.status === 403, tryAct.json);
  const ver = await api('PATCH', `/admin/owners/${ownerId}/verifikasi`, { token: ADMIN, body: { status: 'Terverifikasi' } });
  check('Admin verifikasi Owner -> 200', ver.status === 200 && ver.data.owner.status_verifikasi === 'Terverifikasi', ver.json);
  const stillPending = await api('GET', `/owner/kos/${pendingId}`, { token: OWNER });
  check('Kos tetap Menunggu sampai dipublikasikan', stillPending.data.status_verifikasi === 'Menunggu', stillPending.data);
  const act = await api('PATCH', `/owner/kos/${pendingId}/status`, { token: OWNER, body: { status: 'Aktif' } });
  check('Owner terverifikasi publikasikan kos -> 200 Aktif', act.status === 200 && act.data.status_verifikasi === 'Aktif', act.json);
  const owners = await api('GET', '/admin/owners?status=Terverifikasi', { token: ADMIN });
  check('Admin list owner terfilter status', owners.status === 200 && owners.data.every((o) => o.status_verifikasi === 'Terverifikasi'));
  await api('DELETE', `/owner/kos/${pendingId}`, { token: OWNER });

  // ---------------- 4. FASILITAS, KOS, KAMAR ----------------
  section('4. Fasilitas, kos, kamar, foto');
  const fas = await api('POST', '/fasilitas', { token: ADMIN, body: { nama_fasilitas: `Smoke Fasilitas ${TS}` } });
  check('Admin tambah fasilitas -> 201', fas.status === 201, fas.json);
  const fasId = fas.data.fasilitas_id;
  const fasDup = await api('POST', '/fasilitas', { token: ADMIN, body: { nama_fasilitas: `smoke fasilitas ${TS}` } });
  check('Fasilitas duplikat (case-insensitive) -> 409', fasDup.status === 409);
  const fasEdit = await api('PUT', `/fasilitas/${fasId}`, { token: ADMIN, body: { nama_fasilitas: `Smoke Fasilitas ${TS} Edit` } });
  check('Admin edit fasilitas -> 200', fasEdit.status === 200);

  const kA = await api('POST', '/owner/kos', { token: OWNER, body: kosBody({ fasilitas: [fasId, 1] }) });
  check('Owner terverifikasi buat kos -> 201 langsung Aktif', kA.status === 201 && kA.data.status_verifikasi === 'Aktif', kA.json);
  const kosA = kA.data.kos_id;
  const kB = await api('POST', '/owner/kos', {
    token: OWNER,
    body: kosBody({ nama_kos: 'Kos Smoke Beta', latitude: lat - 0.045, tipe_kos: 'Putra', fasilitas: [fasId], alamat: `Jl. Smoke No. 2, Kecamatan Uji, ${wilayah}` }),
  });
  const kosB = kB.data.kos_id;
  check('Kos kedua dibuat', kB.status === 201);
  const setFas = await api('PUT', `/owner/kos/${kosB}/fasilitas`, { token: OWNER, body: { fasilitas: [fasId] } });
  check('Checklist fasilitas (ganti-total) -> 200', setFas.status === 200);

  const kmA1 = await api('POST', `/owner/kos/${kosA}/kamar`, { token: OWNER, body: { no_kamar: 'A1', tipe_kamar: 'Standar', harga: 555000 } });
  const kmA2 = await api('POST', `/owner/kos/${kosA}/kamar`, { token: OWNER, body: { no_kamar: 'A2', tipe_kamar: 'Deluxe', harga: 1500000 } });
  const kmB1 = await api('POST', `/owner/kos/${kosB}/kamar`, { token: OWNER, body: { no_kamar: 'B1', tipe_kamar: 'Suite', harga: 2500000 } });
  check('Tambah kamar -> 201', kmA1.status === 201 && kmA2.status === 201 && kmB1.status === 201, kmA1.json);
  const kamarA1 = kmA1.data.kamar_id;
  const dupKamar = await api('POST', `/owner/kos/${kosA}/kamar`, { token: OWNER, body: { no_kamar: 'A1', tipe_kamar: 'Standar', harga: 1 } });
  check('No kamar duplikat dalam kos -> 409', dupKamar.status === 409);
  const negHarga = await api('POST', `/owner/kos/${kosA}/kamar`, { token: OWNER, body: { no_kamar: 'A9', tipe_kamar: 'Standar', harga: -5 } });
  check('Harga negatif -> 422', negHarga.status === 422);
  const manualDB = await api('POST', `/owner/kos/${kosA}/kamar`, { token: OWNER, body: { no_kamar: 'A8', tipe_kamar: 'Standar', harga: 5, status_kamar: 'Dalam Booking' } });
  check('Status manual "Dalam Booking" ditolak -> 422', manualDB.status === 422);

  // upload foto (PNG 1x1)
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkaPhfDwAEhgGAWn0p0AAAAABJRU5ErkJggg==', 'base64');
  const form = new FormData();
  form.append('foto', new Blob([png], { type: 'image/png' }), 'kamar.png');
  const up = await api('POST', `/owner/kos/${kosA}/foto`, { token: OWNER, form });
  check('Upload foto -> 201 path relatif', up.status === 201 && /^kos\/[\w-]+\.png$/.test(up.data[0].path_foto), up.json);
  if (up.status === 201) {
    const img = await fetch(`${ROOT}/uploads/${up.data[0].path_foto}`);
    check('Foto dapat diakses lewat /uploads', img.status === 200);
  }
  const fake = new FormData();
  fake.append('foto', new Blob([Buffer.from('bukan gambar')], { type: 'image/png' }), 'palsu.png');
  const upFake = await api('POST', `/owner/kos/${kosA}/foto`, { token: OWNER, form: fake });
  check('Upload berkas palsu -> 422', upFake.status === 422, upFake.json);

  let list = await api('GET', '/kos', { token: USER1 });
  check('Kos Aktif muncul di GET /api/kos', list.status === 200 && list.data.some((k) => k.kos_id === kosA));
  await api('PATCH', `/owner/kos/${kosB}/status`, { token: OWNER, body: { status: 'Nonaktif' } });
  list = await api('GET', '/kos', { token: USER1 });
  check('Kos Nonaktif tidak muncul', !list.data.some((k) => k.kos_id === kosB));
  await api('PATCH', `/owner/kos/${kosB}/status`, { token: OWNER, body: { status: 'Aktif' } });

  // ---------------- 5. FILTER ----------------
  section('5. Filter peta');
  const q = (s) => api('GET', `/kos?lat=${lat}&lng=${lng}&${s}`, { token: USER1 });
  const ids = (r) => (r.data || []).map((k) => k.kos_id);
  let r = await q('radius=1');
  check('Radius 1 km: kos A ada, kos B (±5 km) hilang', ids(r).includes(kosA) && !ids(r).includes(kosB), ids(r));
  check('jarak_km terisi', r.data.every((k) => typeof k.jarak_km === 'number'));
  r = await q('radius=10');
  check('Radius 10 km: kos A & B ada, terurut terdekat', ids(r).includes(kosA) && ids(r).includes(kosB) && ids(r).indexOf(kosA) < ids(r).indexOf(kosB), ids(r));
  check('Radius 10 km: kos Bandung (dummy) di luar radius hilang', !ids(r).includes(1));
  r = await q('radius=10&hargaMin=2000000');
  check('Filter harga min', !ids(r).includes(kosA) && ids(r).includes(kosB), ids(r));
  r = await q('radius=10&hargaMax=600000');
  check('Filter harga max', ids(r).includes(kosA) && !ids(r).includes(kosB), ids(r));
  r = await q(`radius=10&fasilitas=${fasId},1`);
  check('Filter fasilitas AND', ids(r).includes(kosA) && !ids(r).includes(kosB), ids(r));
  r = await q(`radius=10&fasilitas=${fasId}`);
  check('Filter fasilitas tunggal', ids(r).includes(kosA) && ids(r).includes(kosB), ids(r));
  r = await q('radius=10&tipe=Putra');
  check('Filter tipe kos', !ids(r).includes(kosA) && ids(r).includes(kosB), ids(r));
  r = await api('GET', '/kos?hargaMin=5000&hargaMax=10', { token: USER1 });
  check('Harga min > max -> 422', r.status === 422);

  // ---------------- 6. BOOKING ----------------
  section('6. Booking & approval');
  const regU = await api('POST', '/auth/register', { body: { nama: 'Smoke User', email: `smoke.user.${TS}@test.local`, password: PASS, role: 'User' } });
  check('Register User -> 201 Terverifikasi', regU.status === 201 && regU.data.user.status_verifikasi === 'Terverifikasi', regU.json);
  const USER = regU.data.token;
  const today = todayWIB();
  const kamarStatus = async (id) => {
    const res = await api('GET', `/owner/kos/${kosA}/kamar`, { token: OWNER });
    return res.data.kamar.find((k) => k.kamar_id === id).status_kamar;
  };
  check('Owner tidak bisa booking -> 403', (await api('POST', '/booking', { token: OWNER, body: { kamar_id: kamarA1, tanggal_survey: today } })).status === 403);
  const past = await api('POST', '/booking', { token: USER, body: { kamar_id: kamarA1, tanggal_survey: addDays(today, -1) } });
  check('Tanggal lampau -> 422', past.status === 422, past.json);
  let b1 = await api('POST', '/booking', { token: USER, body: { kamar_id: kamarA1, tanggal_survey: today } });
  check('Booking sukses (tanggal hari ini WIB) -> 201', b1.status === 201, b1.json);
  check('Kamar menjadi Dalam Booking', (await kamarStatus(kamarA1)) === 'Dalam Booking');
  const b2 = await api('POST', '/booking', { token: USER1, body: { kamar_id: kamarA1, tanggal_survey: addDays(today, 2) } });
  check('Booking kedua kamar sama -> 409', b2.status === 409 && b2.json.message === 'Kamar sudah dibooking.', b2.json);
  const manual = await api('PUT', `/owner/kamar/${kamarA1}`, { token: OWNER, body: { no_kamar: 'A1', tipe_kamar: 'Standar', harga: 555000, status_kamar: 'Terisi' } });
  check('Ubah status manual saat ada booking aktif -> 409', manual.status === 409);
  const otherOwner = await api('PATCH', `/owner/booking/${b1.data.booking_id}/setujui`, { token: OWNER1 });
  check('Owner lain setujui booking -> 403', otherOwner.status === 403);
  const tolak = await api('PATCH', `/owner/booking/${b1.data.booking_id}/tolak`, { token: OWNER });
  check('Owner tolak -> 200 kamar Kosong', tolak.status === 200 && (await kamarStatus(kamarA1)) === 'Kosong', tolak.json);
  const tolakLagi = await api('PATCH', `/owner/booking/${b1.data.booking_id}/setujui`, { token: OWNER });
  check('Proses booking non-Menunggu -> 409', tolakLagi.status === 409);
  const buktiTolak = await api('GET', `/booking/${b1.data.booking_id}/bukti`, { token: USER });
  check('Bukti booking Ditolak tidak tersedia -> 403', buktiTolak.status === 403);
  b1 = await api('POST', '/booking', { token: USER, body: { kamar_id: kamarA1, tanggal_survey: addDays(today, 1) } });
  check('Ajukan lagi -> 201', b1.status === 201, b1.json);
  const bookingId = b1.data.booking_id;
  const ownerList = await api('GET', '/owner/booking?status=Menunggu', { token: OWNER });
  check('Owner lihat booking masuk (filter status)', ownerList.status === 200 && ownerList.data.some((b) => b.booking_id === bookingId));
  const setuju = await api('PATCH', `/owner/booking/${bookingId}/setujui`, { token: OWNER });
  check('Owner setujui -> 200 kamar Terisi', setuju.status === 200 && (await kamarStatus(kamarA1)) === 'Terisi', setuju.json);
  const bukti = await api('GET', `/booking/${bookingId}/bukti`, { token: USER });
  check('Bukti booking (User) -> application/pdf', bukti.status === 200 && bukti.type.includes('application/pdf') && bukti.buffer.length > 1000, bukti.type);
  const buktiO = await api('GET', `/booking/${bookingId}/bukti`, { token: OWNER });
  check('Bukti booking (Owner) -> application/pdf', buktiO.status === 200 && buktiO.type.includes('application/pdf'));
  check('Bukti booking orang lain -> 403', (await api('GET', `/booking/${bookingId}/bukti`, { token: USER1 })).status === 403);
  check('Bukti booking oleh Admin -> 403', (await api('GET', `/booking/${bookingId}/bukti`, { token: ADMIN })).status === 403);

  // ---------------- 7. AUTO-SELESAI ----------------
  section('7. Auto-Selesai');
  const preReview = await api('POST', `/booking/${bookingId}/review`, { token: USER, body: { rating: 5 } });
  check('Review sebelum Selesai -> 403', preReview.status === 403, preReview.json);
  const done = await makePastAndFinish(bookingId);
  check('autoSelesai() memproses booking terlampaui', done >= 1, done);
  const mine = await api('GET', '/booking/saya', { token: USER });
  const mineB = mine.data.find((b) => b.booking_id === bookingId);
  check('Booking menjadi Selesai', mineB && mineB.status_booking === 'Selesai', mineB);
  check('Kamar kembali Kosong', (await kamarStatus(kamarA1)) === 'Kosong');
  check('bisa_review = true', mineB && mineB.bisa_review === true);

  // ---------------- 8. REVIEW ----------------
  section('8. Review & rating');
  check('Rating 0 -> 422', (await api('POST', `/booking/${bookingId}/review`, { token: USER, body: { rating: 0 } })).status === 422);
  check('Rating 6 -> 422', (await api('POST', `/booking/${bookingId}/review`, { token: USER, body: { rating: 6 } })).status === 422);
  check('Review booking orang lain -> 403', (await api('POST', `/booking/${bookingId}/review`, { token: USER1, body: { rating: 4 } })).status === 403);
  const rv = await api('POST', `/booking/${bookingId}/review`, { token: USER, body: { rating: 5, komentar: 'Mantap, uji otomatis.' } });
  check('Review setelah Selesai -> 201', rv.status === 201, rv.json);
  check('Review ganda -> 409', (await api('POST', `/booking/${bookingId}/review`, { token: USER, body: { rating: 4 } })).status === 409);
  let det = await api('GET', `/kos/${kosA}`, { token: USER });
  check('Rata-rata rating = 5.0 (1 review)', det.data.rata_rating === 5 && det.data.jumlah_review === 1, det.data && det.data.rata_rating);
  // siklus kedua -> rating 2 -> rata-rata 3.5
  const b3 = await api('POST', '/booking', { token: USER, body: { kamar_id: kamarA1, tanggal_survey: today } });
  await api('PATCH', `/owner/booking/${b3.data.booking_id}/setujui`, { token: OWNER });
  await makePastAndFinish(b3.data.booking_id);
  await api('POST', `/booking/${b3.data.booking_id}/review`, { token: USER, body: { rating: 2 } });
  det = await api('GET', `/kos/${kosA}`, { token: USER });
  check('Rata-rata rating berubah = 3.5 (2 review)', det.data.rata_rating === 3.5 && det.data.jumlah_review === 2, det.data.rata_rating);
  check('Daftar review di detail kos', det.data.review.length === 2 && det.data.review[0].nama_user === 'Smoke User');
  list = await api('GET', `/kos?lat=${lat}&lng=${lng}&radius=1`, { token: USER });
  check('Rating tampil di data peta', list.data.find((k) => k.kos_id === kosA).rata_rating === 3.5);

  // ---------------- 9. DASHBOARD & LAPORAN ----------------
  section('9. Dashboard & laporan');
  const dO = await api('GET', '/owner/dashboard', { token: OWNER });
  check(
    'Dashboard Owner -> 200 + struktur grafik',
    dO.status === 200 && dO.data.kartu.total_kos === 2 && dO.data.kartu.total_kamar === 3 &&
      dO.data.grafik.statusKamar.labels.length === 3 && dO.data.grafik.pendapatanPerBulan.labels.length === 6 &&
      Array.isArray(dO.data.grafik.okupansiPerKos.data),
    dO.json
  );
  check('Estimasi pendapatan bulan ini = 2 x 555.000', dO.data.grafik.pendapatanPerBulan.data[5] === 1110000, dO.data.grafik.pendapatanPerBulan);
  const dA = await api('GET', '/admin/dashboard', { token: ADMIN });
  check(
    'Dashboard Admin -> 200 + struktur grafik',
    dA.status === 200 && typeof dA.data.kartu.owner_menunggu === 'number' && dA.data.grafik.pertumbuhanBooking.labels.length === 12 &&
      dA.data.grafik.kosPerWilayah.labels.includes(wilayah),
    dA.json
  );
  check('Dashboard Admin oleh Owner -> 403', (await api('GET', '/admin/dashboard', { token: OWNER })).status === 403);
  let lp = await api('GET', `/laporan?wilayah=${encodeURIComponent(wilayah)}`, { token: ADMIN });
  check('Laporan filter wilayah', lp.status === 200 && lp.data.kos.length === 2 && lp.data.kos.every((k) => k.wilayah === wilayah), lp.data && lp.data.kos.length);
  lp = await api('GET', '/laporan?tipeKos=Putri', { token: ADMIN });
  check('Laporan filter tipe kos', lp.status === 200 && lp.data.kos.length > 0 && lp.data.kos.every((k) => k.tipe_kos === 'Putri'));
  lp = await api('GET', '/laporan?statusBooking=Selesai', { token: ADMIN });
  check('Laporan filter status booking', lp.status === 200 && lp.data.booking.length > 0 && lp.data.booking.every((b) => b.status_booking === 'Selesai'));
  lp = await api('GET', '/laporan', { token: OWNER });
  check('Laporan Owner hanya data miliknya', lp.status === 200 && lp.data.kos.length === 2 && lp.data.grafik.bookingPerBulan.labels.length === 12);
  check('Laporan oleh User -> 403', (await api('GET', '/laporan', { token: USER })).status === 403);

  // ---------------- 10. EKSPOR & BACKUP ----------------
  section('10. Ekspor & backup');
  for (const jenis of ['kos', 'kamar', 'booking']) {
    for (const format of ['pdf', 'xlsx']) {
      const ex = await api('GET', `/export/${jenis}.${format}?wilayah=${encodeURIComponent(wilayah)}`, { token: OWNER });
      const expected = format === 'pdf' ? 'application/pdf' : 'spreadsheetml';
      check(`Ekspor ${jenis}.${format} -> 200 ${expected}`, ex.status === 200 && ex.type.includes(expected) && ex.buffer.length > 500, `${ex.status} ${ex.type}`);
    }
  }
  const exAdmin = await api('GET', '/export/booking.xlsx?statusBooking=Selesai', { token: ADMIN });
  check('Ekspor Admin dengan filter -> 200', exAdmin.status === 200);
  check('Ekspor jenis tidak dikenal -> 404', (await api('GET', '/export/user.pdf', { token: ADMIN })).status === 404);
  check('Ekspor oleh User -> 403', (await api('GET', '/export/kos.pdf', { token: USER })).status === 403);

  for (const [label, token] of [['Admin', ADMIN], ['Owner', OWNER]]) {
    const bx = await api('GET', '/backup/xlsx', { token });
    let noPwd = false;
    let sheetCount = 0;
    if (bx.status === 200) {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(bx.buffer);
      sheetCount = wb.worksheets.length;
      noPwd = wb.worksheets.every((ws) => !(ws.getRow(1).values || []).some((v) => String(v).toLowerCase().includes('password')));
      const userSheet = wb.getWorksheet('user');
      let hashLeak = false;
      userSheet.eachRow((row) => {
        if (JSON.stringify(row.values).includes('$2b$')) hashLeak = true;
      });
      noPwd = noPwd && !hashLeak;
    }
    check(`Backup xlsx (${label}) -> 200, 8 sheet, tanpa password`, bx.status === 200 && sheetCount === 8 && noPwd, `${bx.status} sheets=${sheetCount}`);
  }
  const csv = await api('GET', '/backup/csv/user', { token: ADMIN });
  const csvText = csv.buffer.toString('utf8');
  check('Backup CSV user -> 200, BOM UTF-8, tanpa password', csv.status === 200 && csv.buffer[0] === 0xef && !/password/i.test(csvText) && !csvText.includes('$2b$'), csvText.slice(0, 120));
  let allCsv = true;
  for (const t of ['kos', 'foto_kos', 'fasilitas', 'kos_fasilitas', 'kamar', 'booking', 'review']) {
    const c = await api('GET', `/backup/csv/${t}`, { token: OWNER });
    if (c.status !== 200 || !c.type.includes('text/csv')) allCsv = false;
  }
  check('Backup CSV semua tabel (Owner) -> 200', allCsv);
  check('Backup CSV tabel tidak dikenal -> 404', (await api('GET', '/backup/csv/pg_user', { token: ADMIN })).status === 404);

  // ---------------- BERSIH-BERSIH ----------------
  section('Pembersihan data uji');
  const del1 = await api('DELETE', `/owner/kos/${kosA}`, { token: OWNER });
  const del2 = await api('DELETE', `/owner/kos/${kosB}`, { token: OWNER });
  const del3 = await api('DELETE', `/fasilitas/${fasId}`, { token: ADMIN });
  check('Hapus kos & fasilitas uji', del1.status === 200 && del2.status === 200 && del3.status === 200);
  await pool.query(`DELETE FROM "user" WHERE email LIKE 'smoke.%@test.local'`);
  OWNER = null;
}

main()
  .catch((err) => {
    results.fail += 1;
    console.error('\n\u2716 Smoke test berhenti karena error:', err);
  })
  .finally(async () => {
    await pool.end().catch(() => {});
    console.log(`\nHasil: ${results.pass} lulus, ${results.fail} gagal.`);
    process.exit(results.fail ? 1 : 0);
  });
