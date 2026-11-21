-- =====================================================================
-- Migrasi 001: Tambah jenis booking (survey | sewa) & kos_id pada booking
-- Aman dijalankan ulang (idempotent) tanpa merusak data booking lama.
-- Jalankan di Supabase SQL Editor atau lewat: node backend/scripts/migrate-tipe-booking.js
-- =====================================================================

BEGIN;

-- 1. Tambahkan kolom tipe_booking (default 'sewa' agar seluruh data lama tetap valid)
ALTER TABLE booking
  ADD COLUMN IF NOT EXISTS tipe_booking varchar(20) NOT NULL DEFAULT 'sewa';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_booking_tipe'
  ) THEN
    ALTER TABLE booking
      ADD CONSTRAINT chk_booking_tipe CHECK (tipe_booking IN ('survey', 'sewa'));
  END IF;
END $$;

-- 2. Tambahkan kolom kos_id agar booking survey tanpa kamar spesifik tetap terikat ke kos
ALTER TABLE booking
  ADD COLUMN IF NOT EXISTS kos_id integer REFERENCES kos(kos_id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Isi kos_id untuk seluruh booking lama berdasarkan relasi kamar
UPDATE booking b
   SET kos_id = km.kos_id
  FROM kamar km
 WHERE b.kamar_id = km.kamar_id
   AND b.kos_id IS NULL;

-- Pastikan kos_id wajib terisi
ALTER TABLE booking
  ALTER COLUMN kos_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_booking_kos  ON booking(kos_id);
CREATE INDEX IF NOT EXISTS idx_booking_tipe ON booking(tipe_booking);

-- 3. Izinkan kamar_id bernilai NULL khusus untuk booking survey; booking sewa wajib punya kamar_id
ALTER TABLE booking
  ALTER COLUMN kamar_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_booking_kamar_sewa'
  ) THEN
    ALTER TABLE booking
      ADD CONSTRAINT chk_booking_kamar_sewa CHECK (tipe_booking = 'survey' OR kamar_id IS NOT NULL);
  END IF;
END $$;

-- 4. Perbarui unique index anti double-booking agar HANYA berlaku untuk booking 'sewa'
--    Booking 'survey' tidak boleh mengunci kamar.
DROP INDEX IF EXISTS uq_booking_aktif_per_kamar;
CREATE UNIQUE INDEX uq_booking_aktif_per_kamar
  ON booking(kamar_id)
  WHERE tipe_booking = 'sewa'
    AND status_booking IN ('Menunggu', 'Disetujui')
    AND kamar_id IS NOT NULL;

COMMIT;
