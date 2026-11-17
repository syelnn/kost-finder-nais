import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { downloadFile, getErrorMessage, getFieldErrors } from '../../api/client';
import AppLayout from '../../components/AppLayout';
import { EmptyState, Modal, Spinner, StarRating, StatusBadge } from '../../components/Ui';
import { useToast } from '../../context/ToastContext';
import { formatRupiah, formatTanggal } from '../../utils/format';

export default function UserBookingsPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  const [reviewModal, setReviewModal] = useState(null);
  const [rating, setRating] = useState(5);
  const [komentar, setKomentar] = useState('');
  const [reviewErrors, setReviewErrors] = useState({});
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadMyBookings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/booking/saya');
      setBookings(data.data || []);
    } catch (err) {
      showToast(getErrorMessage(err, 'Gagal memuat riwayat booking.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadMyBookings();
  }, [loadMyBookings]);

  const handleDownloadBukti = async (bookingId) => {
    setDownloadingId(bookingId);
    try {
      await downloadFile(
        `/booking/${bookingId}/bukti`,
        `bukti-booking-${String(bookingId).padStart(5, '0')}.pdf`
      );
      showToast('Bukti konfirmasi booking berhasil diunduh.', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Gagal mengunduh bukti booking.'), 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const openReviewModal = (b) => {
    setReviewModal(b);
    setRating(5);
    setKomentar('');
    setReviewErrors({});
  };

  const handleSubmitReview = async () => {
    if (!reviewModal) return;
    setReviewErrors({});
    setSubmittingReview(true);
    try {
      const { data } = await api.post(`/booking/${reviewModal.booking_id}/review`, {
        rating,
        komentar,
      });
      showToast(data.message || 'Review berhasil dikirim.', 'success');
      setReviewModal(null);
      loadMyBookings();
    } catch (err) {
      setReviewErrors(getFieldErrors(err));
      showToast(getErrorMessage(err, 'Gagal mengirim review.'), 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>Riwayat Booking Saya</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Pantau status persetujuan pemilik kos, unduh Bukti Konfirmasi Booking (PDF), dan berikan review setelah selesai.
          </p>
        </div>
        <Link to="/peta" className="btn btn-primary">
          Cari Kos di Peta
        </Link>
      </div>

      <div className="card">
        {loading ? (
          <Spinner label="Memuat booking Anda..." />
        ) : bookings.length === 0 ? (
          <EmptyState
            title="Anda belum memiliki riwayat booking"
            description="Jelajahi peta interaktif dan pilih kamar kosong untuk mengajukan booking."
            actionLabel="Cari Kos Sekarang"
            onAction={() => navigate('/peta')}
          />
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nama Kos & Alamat</th>
                  <th>Kamar & Harga</th>
                  <th>Tanggal Survey/Sewa</th>
                  <th>Status Booking</th>
                  <th>Bukti & Review</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.booking_id}>
                    <td>#{b.booking_id}</td>
                    <td>
                      <Link to={`/kos/${b.kos_id}`}>
                        <strong>{b.nama_kos}</strong>
                      </Link>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.alamat}</div>
                    </td>
                    <td>
                      <strong>
                        No. {b.no_kamar} - Tipe {b.tipe_kamar}
                      </strong>
                      <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>
                        {formatRupiah(b.harga)}/bulan
                      </div>
                    </td>
                    <td>{formatTanggal(b.tanggal_survey)}</td>
                    <td>
                      <StatusBadge status={b.status_booking} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        {['Disetujui', 'Selesai'].includes(b.status_booking) && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            disabled={downloadingId === b.booking_id}
                            onClick={() => handleDownloadBukti(b.booking_id)}
                          >
                            {downloadingId === b.booking_id ? 'Mengunduh...' : 'Unduh Bukti PDF'}
                          </button>
                        )}

                        {b.bisa_review && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => openReviewModal(b)}
                          >
                            Beri Review
                          </button>
                        )}

                        {b.review_id && (
                          <span className="badge badge-teal" title={b.komentar || ''}>
                            Sudah direview (★ {b.rating})
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={Boolean(reviewModal)}
        title={`Beri Review — ${reviewModal?.nama_kos || ''}`}
        onClose={() => setReviewModal(null)}
        onConfirm={handleSubmitReview}
        confirmLabel="Kirim Review"
        loading={submittingReview}
      >
        {reviewModal && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Kamar No. {reviewModal.no_kamar} ({reviewModal.tipe_kamar}) · Tanggal {formatTanggal(reviewModal.tanggal_survey)}
            </p>
            <div className="form-group">
              <label>Rating Bintang (1–5, wajib)</label>
              <StarRating value={rating} onChange={setRating} />
              {reviewErrors.rating && <div className="field-error">{reviewErrors.rating}</div>}
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="rv-komentar">Komentar (Opsional, maks. 1000 karakter)</label>
              <textarea
                id="rv-komentar"
                className={`form-control ${reviewErrors.komentar ? 'is-invalid' : ''}`}
                placeholder="Bagikan pengalaman Anda mengenai kebersihan, fasilitas, dan kenyamanan kos..."
                value={komentar}
                onChange={(e) => setKomentar(e.target.value)}
              />
              {reviewErrors.komentar && <div className="field-error">{reviewErrors.komentar}</div>}
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
