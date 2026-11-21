import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { BedDouble, CalendarSearch, Check, MapPin, Star } from 'lucide-react';
import api, { getErrorMessage, getFieldErrors } from '../../api/client';
import AppLayout from '../../components/AppLayout';
import { EmptyState, KosImage, Spinner, StarRating, StatusBadge } from '../../components/Ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatRating, formatRupiah, formatTanggal, todayWIB } from '../../utils/format';

export default function UserKosDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const userRoleRef = useRef(user?.role);
  userRoleRef.current = user?.role;

  const currentPath = `${location.pathname}${location.search}`;
  const isUser = user?.role === 'User';
  const isReadOnlyRole = Boolean(user && !isUser);

  const [kos, setKos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tipeBooking, setTipeBooking] = useState('survey'); // default: Booking Survey
  const [selectedKamarId, setSelectedKamarId] = useState('');
  const [tanggalSurvey, setTanggalSurvey] = useState(todayWIB());
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/kos/${id}`);
      const d = data.data;
      setKos(d);
    } catch (err) {
      showToast(getErrorMessage(err, 'Kos tidak ditemukan atau tidak aktif.'), 'error');
      navigate(userRoleRef.current === 'User' ? '/peta' : '/', { replace: true });
    } finally {
      setLoading(false);
    }
  }, [id, navigate, showToast]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleChangeTipeBooking = (nextTipe) => {
    setTipeBooking(nextTipe);
    setErrors({});
    if (nextTipe === 'sewa') {
      const emptyRooms = (kos?.kamar || []).filter((km) => km.status_kamar === 'Kosong');
      const isCurrentEmpty = emptyRooms.some((km) => String(km.kamar_id) === String(selectedKamarId));
      if (!isCurrentEmpty) {
        setSelectedKamarId(emptyRooms.length ? String(emptyRooms[0].kamar_id) : '');
      }
    }
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login', { state: { from: currentPath } });
      return;
    }
    if (user.role !== 'User') return;
    setErrors({});
    setSubmitting(true);
    try {
      const payload = {
        tipe_booking: tipeBooking,
        kos_id: Number(kos.kos_id),
        tanggal_survey: tanggalSurvey,
      };
      if (selectedKamarId) {
        payload.kamar_id = Number(selectedKamarId);
      }
      const { data } = await api.post('/booking', payload);
      showToast(
        data.message ||
          (tipeBooking === 'survey'
            ? 'Booking survey berhasil diajukan!'
            : 'Booking kamar berhasil diajukan!'),
        'success'
      );
      navigate('/booking-saya');
    } catch (err) {
      setErrors(getFieldErrors(err));
      showToast(getErrorMessage(err, 'Gagal mengajukan booking.'), 'error');
      loadDetail();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <Spinner label="Memuat detail kos..." />
      </AppLayout>
    );
  }

  if (!kos) return null;

  const kamarKosong = (kos.kamar || []).filter((k) => k.status_kamar === 'Kosong');
  // Hindari pengulangan wilayah bila sudah tercantum di alamat.
  const alamatLengkap =
    kos.wilayah && !String(kos.alamat || '').includes(kos.wilayah)
      ? `${kos.alamat} (${kos.wilayah})`
      : kos.alamat;
  const fotos = kos.foto && kos.foto.length ? kos.foto : [{ foto_id: 0, path_foto: null }];

  return (
    <AppLayout>
      <div className="page-header">
        <div className="kos-detail-head">
          <div className="kos-detail-title-row">
            <h1>{kos.nama_kos}</h1>
            <StatusBadge status={kos.tipe_kos} />
            <StatusBadge status={kos.status_verifikasi} />
          </div>
          <p className="kos-detail-address">
            <MapPin size={16} strokeWidth={2} aria-hidden="true" style={{ flexShrink: 0, color: 'var(--primary)' }} />
            <span>{alamatLengkap}</span>
          </p>
        </div>
        <Link to={isUser ? '/peta' : '/'} className="btn btn-secondary kos-detail-back-btn">
          {isUser ? '← Kembali ke Peta' : '← Kembali ke Beranda'}
        </Link>
      </div>

      {isReadOnlyRole && (
        <div className="kos-readonly-note" role="status">
          Mode pratinjau: Anda masuk sebagai <strong>{user.role === 'Owner' ? 'Pemilik Kos' : 'Administrator'}</strong>.
          Halaman ini bersifat hanya-baca; pengajuan booking hanya tersedia untuk akun Pencari Kos.
        </div>
      )}

      {/* Galeri Foto */}
      <div className="kos-detail-gallery">
        {fotos.map((f) => (
          <KosImage
            key={f.foto_id}
            path={f.path_foto}
            alt={kos.nama_kos}
            className="kos-detail-photo"
          />
        ))}
      </div>

      <div
        className={isReadOnlyRole ? 'kos-detail-single' : 'chart-grid'}
        style={{ alignItems: 'start' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <h2>Informasi Kos & Fasilitas</h2>
            <div className="kos-detail-stats">
              <div className="kos-detail-stat">
                <span className="kos-detail-stat-label">Harga Mulai</span>
                <strong className="kos-detail-stat-value kos-detail-stat-price">
                  {kos.harga_mulai !== null ? `${formatRupiah(kos.harga_mulai)}/bulan` : '-'}
                </strong>
              </div>
              <div className="kos-detail-stat">
                <span className="kos-detail-stat-label">Rating Rata-rata</span>
                <strong className="kos-detail-stat-value" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {kos.rata_rating !== null && kos.rata_rating !== undefined ? (
                    <>
                      <Star size={16} strokeWidth={2} fill="currentColor" style={{ color: '#f59e0b', flexShrink: 0 }} aria-hidden="true" />
                      <span>
                        {formatRating(kos.rata_rating)} ({kos.jumlah_review} review)
                      </span>
                    </>
                  ) : (
                    'Belum ada ulasan'
                  )}
                </strong>
              </div>
              <div className="kos-detail-stat">
                <span className="kos-detail-stat-label">Pemilik</span>
                <strong className="kos-detail-stat-value">
                  {kos.pemilik?.nama || '-'} {kos.pemilik?.no_wa ? `(${kos.pemilik.no_wa})` : ''}
                </strong>
              </div>
            </div>

            <h3>Fasilitas Tersedia</h3>
            {kos.fasilitas?.length ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {kos.fasilitas.map((f) => (
                  <span
                    key={f.fasilitas_id}
                    className="badge badge-teal"
                    style={{ padding: '6px 12px', gap: 6 }}
                  >
                    <Check size={14} strokeWidth={2} aria-hidden="true" />
                    <span>{f.nama_fasilitas}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>Belum ada fasilitas tercatat.</p>
            )}
          </div>

          <div className="card">
            <h2>Daftar Kamar ({kos.kamar?.length || 0} Kamar)</h2>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>No. Kamar</th>
                    <th>Tipe Kamar</th>
                    <th>Harga / Bulan</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(kos.kamar || []).map((km) => (
                    <tr key={km.kamar_id}>
                      <td data-label="No. Kamar">
                        <strong>No. {km.no_kamar}</strong>
                      </td>
                      <td data-label="Tipe Kamar">{km.tipe_kamar}</td>
                      <td data-label="Harga / Bulan">{formatRupiah(km.harga)}</td>
                      <td data-label="Status">
                        <StatusBadge status={km.status_kamar} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h2>Review Penghuni / Pencari Kos ({kos.review?.length || 0})</h2>
            {!kos.review?.length ? (
              <EmptyState
                title="Belum ada review"
                description="Review akan muncul setelah pencari kos menyelesaikan booking pada kos ini."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {kos.review.map((rv) => (
                  <div
                    key={rv.review_id}
                    style={{
                      padding: 12,
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      background: '#f8fafc',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{rv.nama_user}</strong>{' '}
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          (Kamar No. {rv.no_kamar} - {rv.tipe_kamar})
                        </span>
                      </div>
                      <StarRating value={rv.rating} readOnly />
                    </div>
                    {rv.komentar && <p style={{ marginTop: 6, marginBottom: 4 }}>{rv.komentar}</p>}
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {formatTanggal(rv.dibuat_pada)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!authLoading && !user && (
              <p style={{ marginTop: 14, marginBottom: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                Ingin memberi ulasan setelah menyewa?{' '}
                <Link to="/login" state={{ from: currentPath }}>
                  Masuk ke akun Pencari Kos
                </Link>
                .
              </p>
            )}
          </div>
        </div>

        {/* Form Booking: tampil untuk Pencari Kos & tamu (mengarah ke login); disembunyikan untuk Owner/Admin */}
        {!isReadOnlyRole && (
          <div className="card">
            <h2>Ajukan Booking Survey / Kamar</h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              Pilih jenis pengajuan untuk menjadwalkan survey lokasi kos atau memesan kamar kosong secara langsung.
            </p>

            {/* Segmented control / tab pilihan jenis booking */}
            <div className="booking-type-tabs" role="tablist" aria-label="Pilih jenis booking">
              <button
                type="button"
                role="tab"
                aria-selected={tipeBooking === 'survey'}
                className={`booking-type-tab ${tipeBooking === 'survey' ? 'active' : ''}`}
                onClick={() => handleChangeTipeBooking('survey')}
              >
                <CalendarSearch size={17} strokeWidth={2} aria-hidden="true" />
                <span>Booking Survey</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tipeBooking === 'sewa'}
                className={`booking-type-tab ${tipeBooking === 'sewa' ? 'active' : ''}`}
                onClick={() => handleChangeTipeBooking('sewa')}
              >
                <BedDouble size={17} strokeWidth={2} aria-hidden="true" />
                <span>Booking Kamar</span>
              </button>
            </div>

            {authLoading ? (
              <Spinner label="Memeriksa sesi akun..." />
            ) : !user ? (
              <div className="kos-guest-booking">
                <p style={{ fontSize: 14, color: 'var(--text)', marginBottom: 12 }}>
                  {tipeBooking === 'survey' ? (
                    <>
                      Ingin melihat kondisi <strong>{kos.nama_kos}</strong> secara langsung? Masuk terlebih dahulu dengan
                      akun Pencari Kos untuk mengajukan jadwal <strong>Booking Survey</strong>.
                    </>
                  ) : kamarKosong.length > 0 ? (
                    <>
                      Tersedia <strong>{kamarKosong.length} kamar kosong</strong> siap dipesan. Masuk terlebih dahulu
                      dengan akun Pencari Kos untuk mengajukan <strong>Booking Kamar</strong>.
                    </>
                  ) : (
                    <>
                      Saat ini seluruh kamar sedang penuh, namun Anda tetap dapat masuk untuk mengajukan{' '}
                      <strong>Booking Survey</strong> terlebih dahulu.
                    </>
                  )}
                </p>
                <Link to="/login" state={{ from: currentPath }} className="btn btn-primary btn-block">
                  {tipeBooking === 'survey' ? 'Masuk untuk Ajukan Survey' : 'Masuk untuk Booking Kamar'}
                </Link>
                <p style={{ marginTop: 12, marginBottom: 0, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                  Belum punya akun?{' '}
                  <Link to="/register" state={{ from: currentPath }}>
                    Daftar sekarang
                  </Link>
                </p>
              </div>
            ) : tipeBooking === 'sewa' && kamarKosong.length === 0 ? (
              <EmptyState
                title="Semua Kamar Sedang Penuh / Dalam Booking"
                description="Saat ini tidak ada kamar berstatus Kosong untuk dipesan. Anda dapat memilih tab Booking Survey untuk melihat kos terlebih dahulu, atau mencari kos lain di peta."
                actionLabel="Cari Kos Lain di Peta"
                onAction={() => navigate('/peta')}
              />
            ) : (
              <form onSubmit={handleBooking} noValidate>
                {tipeBooking === 'survey' ? (
                  <div className="form-group">
                    <label htmlFor="bk-kamar">Pilih Kamar yang Ingin Disurvey (Opsional)</label>
                    <select
                      id="bk-kamar"
                      className={`form-control ${errors.kamar_id ? 'is-invalid' : ''}`}
                      value={selectedKamarId}
                      onChange={(e) => setSelectedKamarId(e.target.value)}
                    >
                      <option value="">-- Tidak pilih kamar spesifik (Survey Umum) --</option>
                      {(kos.kamar || []).map((km) => (
                        <option key={km.kamar_id} value={km.kamar_id}>
                          No. {km.no_kamar} — {km.tipe_kamar} ({formatRupiah(km.harga)}/bulan · {km.status_kamar})
                        </option>
                      ))}
                    </select>
                    <div className="field-hint">
                      Opsional: booking survey tidak mengunci kamar dan tidak mengubah status ketersediaan kamar.
                    </div>
                    {errors.kamar_id && <div className="field-error">{errors.kamar_id}</div>}
                  </div>
                ) : (
                  <div className="form-group">
                    <label htmlFor="bk-kamar">Pilih Kamar Kosong</label>
                    <select
                      id="bk-kamar"
                      className={`form-control ${errors.kamar_id ? 'is-invalid' : ''}`}
                      value={selectedKamarId}
                      onChange={(e) => setSelectedKamarId(e.target.value)}
                      required
                    >
                      {kamarKosong.map((km) => (
                        <option key={km.kamar_id} value={km.kamar_id}>
                          No. {km.no_kamar} — {km.tipe_kamar} ({formatRupiah(km.harga)}/bulan)
                        </option>
                      ))}
                    </select>
                    {errors.kamar_id && <div className="field-error">{errors.kamar_id}</div>}
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="bk-tanggal">
                    {tipeBooking === 'survey' ? 'Tanggal Survey' : 'Tanggal Mulai Sewa'}
                  </label>
                  <input
                    id="bk-tanggal"
                    type="date"
                    min={todayWIB()}
                    className={`form-control ${errors.tanggal_survey ? 'is-invalid' : ''}`}
                    value={tanggalSurvey}
                    onChange={(e) => setTanggalSurvey(e.target.value)}
                    required
                  />
                  <div className="field-hint">Minimal hari ini (zona waktu WIB).</div>
                  {errors.tanggal_survey && <div className="field-error">{errors.tanggal_survey}</div>}
                </div>

                <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                  {submitting
                    ? 'Mengirim Pengajuan...'
                    : tipeBooking === 'survey'
                    ? 'Ajukan Survey'
                    : 'Ajukan Booking Kamar'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
