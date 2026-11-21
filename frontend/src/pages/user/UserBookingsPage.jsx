import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import api, { downloadFile, getErrorMessage, getFieldErrors } from '../../api/client';
import AppLayout from '../../components/AppLayout';
import { EmptyState, Modal, Pagination, Spinner, StarRating, StatusBadge } from '../../components/Ui';
import { useToast } from '../../context/ToastContext';
import { formatRupiah, formatTanggal } from '../../utils/format';

export default function UserBookingsPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
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
      setPage(1);
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

  const pageSize = 10;
  const paged = bookings.slice((page - 1) * pageSize, page * pageSize);

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
          <>
            <div className="table-responsive">
              <table className="table table-booking">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Jenis</th>
                    <th>Nama Kos & Alamat</th>
                    <th>Kamar & Harga</th>
                    <th>Tanggal Survey/Sewa</th>
                    <th>Status Booking</th>
                    <th>Bukti & Review</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((b) => {
                    const isSurvey = b.tipe_booking === 'survey';
                    return (
                      <tr key={b.booking_id}>
                        <td data-label="ID">#{b.booking_id}</td>
                        <td data-label="Jenis">
                          <StatusBadge status={isSurvey ? 'survey' : 'sewa'}>
                            {isSurvey ? 'Survey' : 'Sewa'}
                          </StatusBadge>
                        </td>
                        <td data-label="Nama Kos & Alamat" className="td-stack" title={b.nama_kos}>
                          <Link to={`/kos/${b.kos_id}`}>
                            <strong>{b.nama_kos}</strong>
                          </Link>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.alamat}</div>
                        </td>
                        <td data-label="Kamar & Harga">
                          {b.no_kamar ? (
                            <>
                              <strong>
                                No. {b.no_kamar} - Tipe {b.tipe_kamar}
                              </strong>
                              <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>
                                {formatRupiah(b.harga)}/bulan
                              </div>
                            </>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Survey Umum</span>
                          )}
                        </td>
                        <td data-label="Tanggal Survey/Sewa">{formatTanggal(b.tanggal_survey)}</td>
                        <td data-label="Status Booking">
                          <StatusBadge status={b.status_booking} />
                        </td>
                        <td data-label="Aksi" className="td-aksi">
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

                            {!isSurvey && b.bisa_review && (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => openReviewModal(b)}
                              >
                                Beri Review
                              </button>
                            )}

                            {!isSurvey && b.review_id && (
                              <span
                                className="badge badge-teal"
                                title={b.komentar || ''}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                              >
                                <span>Sudah direview</span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                  (<Star size={13} strokeWidth={2} fill="currentColor" style={{ color: '#f59e0b' }} aria-hidden="true" />
                                  <span>{b.rating}</span>)
                                </span>
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalItems={bookings.length} pageSize={pageSize} onPageChange={setPage} />
          </>
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
