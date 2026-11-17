# Kos Finder — Aplikasi Pencarian dan Pemesanan Kos Berbasis Peta
**Uji Kompetensi Keahlian (UKK) SMK — Pengembangan Perangkat Lunak dan Gim (PPLG) 2026/2027**

Aplikasi web full-stack pencarian, pemetaan, dan pemesanan kos interaktif berbasis **Leaflet.js + OpenStreetMap**, **Chart.js**, **React 18 (Vite)**, **Node.js + Express**, dan **PostgreSQL (Supabase)**.

---

## 1. Struktur Folder Proyek

```text
kost-finder/
├─ database/
│  ├─ kos_finder_supabase.sql          # Skema PostgreSQL 16 + view + fungsi Haversine + data dummy
│  └─ kop-surat-booking.jpg            # Master kop surat bukti booking
├─ backend/
│  ├─ assets/kop-surat.jpg             # Kop surat untuk generator PDF Bukti Konfirmasi Booking
│  ├─ uploads/kos/                     # Direktori penyimpanan foto kos (path relatif di DB)
│  ├─ scripts/smoke-test.js            # Pengujian otomatis end-to-end (10 skenario)
│  ├─ src/
│  │  ├─ config/{env.js,db.js}
│  │  ├─ middleware/{auth.js,error.js,upload.js}
│  │  ├─ services/{bookingService.js,statsService.js,reportService.js,exportService.js}
│  │  ├─ controllers/{authController.js,adminController.js,fasilitasController.js,ownerController.js,userController.js,buktiController.js,reportController.js}
│  │  ├─ routes/{authRoutes.js,adminRoutes.js,ownerRoutes.js,userRoutes.js,reportRoutes.js}
│  │  ├─ utils/{http.js,validate.js,terbilang.js,format.js}
│  │  ├─ app.js
│  │  └─ server.js
│  ├─ .env.example
│  └─ package.json
├─ frontend/
│  ├─ index.html                       # Memuat CDN Leaflet 1.9.4, Chart.js 4.x, Plus Jakarta Sans
│  ├─ vite.config.js                   # Proxy /api dan /uploads ke http://localhost:5000
│  ├─ src/
│  │  ├─ api/client.js
│  │  ├─ components/{Ui.jsx,ProtectedRoute.jsx,AppLayout.jsx,ChartCanvas.jsx,LocationPickerMap.jsx}
│  │  ├─ context/{AuthContext.jsx,ToastContext.jsx}
│  │  ├─ pages/
│  │  │  ├─ auth/{LandingPage.jsx,LoginPage.jsx,RegisterPage.jsx,NotFoundPage.jsx}
│  │  │  ├─ admin/{AdminDashboardPage.jsx,AdminOwnersPage.jsx,AdminFasilitasPage.jsx}
│  │  │  ├─ owner/{OwnerDashboardPage.jsx,OwnerKosListPage.jsx,OwnerKosFormPage.jsx,OwnerKamarPage.jsx,OwnerBookingPage.jsx}
│  │  │  ├─ user/{UserMapPage.jsx,UserKosDetailPage.jsx,UserBookingsPage.jsx}
│  │  │  └─ LaporanPage.jsx
│  │  ├─ styles/index.css
│  │  ├─ utils/format.js
│  │  ├─ App.jsx
│  │  └─ main.jsx
│  └─ package.json
└─ README.md
```

---

## 2. Prasyarat

- **Node.js** versi 18 atau lebih baru (`node -v`) dan **npm** (`npm -v`).
- **Database PostgreSQL 16+** di **Supabase** (atau PostgreSQL lokal).
- Browser modern (Chrome / Edge / Firefox) yang mendukung ES6+ dan Geolocation API.

---

## 3. Cara Menyiapkan Database Supabase & Menjalankan `kos_finder_supabase.sql`

1. Masuk ke [Supabase Dashboard](https://supabase.com/dashboard) lalu buat project baru.
2. Buka menu **SQL Editor** → klik **New query**.
3. Salin seluruh isi file `database/kos_finder_supabase.sql`, tempel ke editor, lalu klik **Run**.
4. Ambil connection string PostgreSQL:
   - Klik tombol **Connect** di bagian atas dashboard Supabase.
   - Pilih tab **Connection String** → **URI** → gunakan **Session pooler** (direkomendasikan karena mendukung jaringan IPv4) atau **Direct connection**.
   - Salin URI tersebut dan ganti `[YOUR-PASSWORD]` dengan password database project Supabase Anda.

---

## 4. Konfigurasi `.env` & Instalasi

### a. Backend (`backend/.env`)
Salin `backend/.env.example` menjadi `backend/.env`, lalu isi nilainya:

```env
DATABASE_URL=postgresql://postgres.xxxxxxxxxxxx:PASSWORD_ANDA@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
DB_SSL=true
JWT_SECRET=rahasia-jwt-kos-finder-ukk-pplg-2026-2027
JWT_EXPIRES_IN=8h
CLIENT_ORIGIN=http://localhost:5173
PORT=5000
TZ=Asia/Jakarta
```

> Catatan: Jika menggunakan PostgreSQL lokal tanpa SSL, ubah `DB_SSL=false`.

### b. Instal Dependensi & Jalankan Aplikasi

Buka 2 terminal:

**Terminal 1 — Backend (port `5000`):**
```bash
cd backend
npm install
npm run dev
```

**Terminal 2 — Frontend (port `5173`):**
```bash
cd frontend
npm install
npm run dev
```

Buka aplikasi di browser: **`http://localhost:5173`**

---

## 5. Daftar Akun Dummy (Password Semua Akun: `Password123!`)

| Peran | Email | Status Verifikasi | Keterangan Data Awal |
|---|---|---|---|
| **Admin** | `admin@kosfinder.id` | `Terverifikasi` | Mengelola verifikasi Owner, master fasilitas, laporan & backup |
| **Owner** | `owner1@kosfinder.id` | `Terverifikasi` | Pemilik Kos ID 1–4 (`Aktif`) |
| **Owner** | `owner2@kosfinder.id` | `Terverifikasi` | Pemilik Kos ID 5–7 (`Aktif`) |
| **Owner** | `owner3@kosfinder.id` | `Menunggu` | Pemilik Kos ID 8 (`Menunggu`, belum bisa dipublikasikan) |
| **User** | `user1@kosfinder.id` | `Terverifikasi` | Pencari kos (memiliki booking aktif & booking `Selesai` siap direview) |
| **User** | `user2@kosfinder.id` | `Terverifikasi` | Pencari kos |
| **User** | `user3@kosfinder.id` | `Terverifikasi` | Pencari kos |
| **User** | `user4@kosfinder.id` | `Terverifikasi` | Pencari kos |

---

## 6. Keputusan Bisnis & Asumsi (State Machine)

1. **Registrasi & Verifikasi Owner**:
   - Halaman `/register` hanya mengizinkan pendaftaran **User** (`Terverifikasi`) atau **Owner** (`Menunggu`). Akun **Admin** berasal dari seed SQL.
   - Owner `Menunggu` dapat menambah/mengedit kos & kamar, tetapi kos baru dipaksa berstatus `Menunggu` dan percobaan mengaktifkan kos mengembalikan `403`.
   - Saat Admin memverifikasi Owner, kos miliknya tetap `Menunggu` sampai Owner menekan tombol **Publikasikan**. Bila Admin membatalkan verifikasi Owner, status Owner kembali `Menunggu` dan seluruh kos `Aktif` miliknya otomatis menjadi `Nonaktif`.
2. **Wilayah Kos**:
   - Diambil dari segmen terakhir kolom `alamat` setelah tanda koma terakhir (`v_kos_ringkas.wilayah`). Form alamat memvalidasi minimal 2 tanda koma (`"Jalan, Kecamatan, Kota/Kabupaten"`).
3. **Sinkronisasi Status Booking & Kamar (`syncRoomStatus`)**:
   - User mengajukan booking → `status_booking = 'Menunggu'`, `status_kamar = 'Dalam Booking'` (dikunci dalam transaksi `SELECT ... FOR UPDATE` + unique index `uq_booking_aktif_per_kamar`).
   - Owner menyetujui → `status_booking = 'Disetujui'`, `status_kamar = 'Terisi'`.
   - Owner menolak → `status_booking = 'Ditolak'`, `status_kamar = 'Kosong'`.
   - Auto-Selesai (`node-cron` tiap jam + saat server start + sebelum endpoint list booking/dashboard/laporan): booking `Disetujui` dengan `tanggal_survey < hari ini (WIB)` otomatis menjadi `Selesai` dan kamarnya kembali `Kosong`.
4. **Bukti Konfirmasi Booking (PDF)**:
   - Hanya tersedia untuk booking berstatus `Disetujui` atau `Selesai` milik User atau Owner terkait.
   - Memakai kop surat `backend/assets/kop-surat.jpg` (fallback kop teks jika file tidak ada), nomor `KOS/BKG-01/BOOK` + 5 digit `booking_id`, serta tanggal cetak dalam kata kapital berbahasa Indonesia (`terbilang`).

---

## 7. Menjalankan Smoke Test Otomatis

Pastikan server backend sedang berjalan (`npm run dev` di folder `backend`), lalu pada terminal lain jalankan:

```bash
cd backend
npm run smoke
```

Skrip `backend/scripts/smoke-test.js` akan menguji seluruh 10 skenario (autentikasi, RBAC/IDOR, alur verifikasi Owner, CRUD fasilitas/kos/kamar/foto, filter radius Haversine/harga/fasilitas AND/tipe, anti double-booking & approval, `autoSelesai`, review & rata-rata rating, dashboard & laporan terfilter, serta ekspor PDF/Excel dan backup `.xlsx`/`.csv` tanpa bocoran kolom `password`), lalu membersihkan data ujinya sendiri.

---

## 8. Troubleshooting

- **Gagal Koneksi Database / SSL Error (`SELF_SIGNED_CERT_IN_CHAIN` / `ENOTFOUND`)**:
  - Pastikan `DATABASE_URL` di `backend/.env` menggunakan **Session pooler** dari Supabase Dashboard dan `DB_SSL=true`.
  - Jika menggunakan PostgreSQL lokal tanpa SSL, set `DB_SSL=false`.
- **Error CORS di Browser**:
  - Pastikan `CLIENT_ORIGIN` di `backend/.env` sesuai dengan alamat frontend (`http://localhost:5173`) dan akses API dilakukan melalui proxy Vite (`/api/...`).
- **Port `5000` atau `5173` Sudah Terpakai (`EADDRINUSE`)**:
  - Hentikan proses Node yang masih berjalan atau ubah `PORT` di `backend/.env` dan target proxy di `frontend/vite.config.js`.
- **Foto Kos Tidak Muncul**:
  - Data dummy merujuk pada nama file contoh (`kos/melati-asri-1.jpg`). Bila file fisik belum diunggah, komponen `<KosImage>` otomatis menampilkan placeholder SVG inline yang rapi sehingga tidak pernah ada ikon gambar rusak (*broken image*). Foto yang diunggah Owner melalui form disimpan di `backend/uploads/kos/` dan langsung disajikan lewat `/uploads/kos/...`.
