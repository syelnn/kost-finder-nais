import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { getErrorMessage, getFieldErrors } from '../../api/client';
import AppLayout from '../../components/AppLayout';
import { EmptyState, KosImage, Spinner, StarRating, StatusBadge } from '../../components/Ui';
import { useToast } from '../../context/ToastContext';
import { formatRating, formatRupiah, formatTanggal, todayWIB } from '../../utils/format';

export default function UserKosDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [kos, setKos] = useState(null);
  const [loading, setLoading] = useState(true);
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
      const firstEmpty = (d.kamar || []).find((km) => km.status_kamar === 'Kosong');
      setSelectedKamarId(firstEmpty ? String(firstEmpty.kamar_id) : '');
    } catch (err) {
      showToast(getErrorMessage(err, 'Kos tidak ditemukan atau tidak aktif.'), 'error');
      navigate('/peta');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, showToast]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleBooking = async (e) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);
    try {
      const { data } = await api.post('/booking', {
        kamar_id: Number(selectedKamarId),
        tanggal_survey: tanggalSurvey,
      });
      showToast(data.message || 'Booking berhasil diajukan!', 'success');
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
  const fotos = kos.foto && kos.foto.length ? kos.foto : [{ foto_id: 0, path_foto: null }];

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0 }}>{kos.nama_kos}</h1>
            <StatusBadge status={kos.tipe_kos} />
            <StatusBadge status={kos.status_verifikasi} />
          </div>
          <p style={{ color: 'var(--text-muted)', marginTop: 4, marginBottom: 0 }}>
            📍 {kos.alamat} ({kos.wilayah})
          </p>
        </div>
        <Link to="/peta" className="btn btn-secondary">
          ← Kembali ke Peta
        </Link>
      </div>

      {/* Galeri Foto */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}
      >
        {fotos.map((f) => (
          <KosImage
            key={f.foto_id}
            path={f.path_foto}
            alt={kos.nama_kos}
            className="kos-card-thumb"
            style={{ width: '100%', height: 220, borderRadius: 12 }}
          />
        ))}
      </div>

      <div className="chart-grid" style={{ alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <h2>Informasi Kos & Fasilitas</h2>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 14, fontSize: 14 }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Harga Mulai: </span>
                <strong style={{ color: 'var(--primary)' }}>
                  {kos.harga_mulai !== null ? `${formatRupiah(kos.harga_mulai)}/bulan` : '-'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Rating Rata-rata: </span>
                <strong>
                  ★ {formatRating(kos.rata_rating)} ({kos.jumlah_review} review)
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Pemilik: </span>
                <strong>
                  {kos.pemilik?.nama || '-'} {kos.pemilik?.no_wa ? `(${kos.pemilik.no_wa})` : ''}
                </strong>
              </div>
            </div>

            <h3>Fasilitas Tersedia</h3>
            {kos.fasilitas?.length ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {kos.fasilitas.map((f) => (
                  <span key={f.fasilitas_id} className="badge badge-teal" style={{ padding: '6px 12px' }}>
                    ✓ {f.nama_fasilitas}
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
                      <td>
                        <strong>No. {km.no_kamar}</strong>
                      </td>
                      <td>{km.tipe_kamar}</td>
                      <td>{formatRupiah(km.harga)}</td>
                      <td>
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
          </div>
        </div>

        {/* Form Booking */}
        <div className="card">
          <h2>Ajukan Booking Survey / Kamar</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Pilih kamar berstatus <strong>Kosong</strong> dan tentukan tanggal rencana survey atau mulai sewa kos.
          </p>

          {kamarKosong.length === 0 ? (
            <EmptyState
              title="Semua Kamar Sedang Penuh / Dalam Booking"
              description="Saat ini tidak ada kamar berstatus Kosong pada kos ini. Silakan pilih kos lain di peta."
              actionLabel="Cari Kos Lain di Peta"
              onAction={() => navigate('/peta')}
            />
          ) : (
            <form onSubmit={handleBooking} noValidate>
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

              <div className="form-group">
                <label htmlFor="bk-tanggal">Tanggal Survey / Mulai Sewa</label>
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
                {submitting ? 'Mengirim Pengajuan...' : 'Ajukan Booking Sekarang'}
              </button>
            </form>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
