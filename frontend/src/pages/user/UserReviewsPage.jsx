import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../../api/client';
import AppLayout from '../../components/AppLayout';
import { EmptyState, KosImage, Spinner, StarRating } from '../../components/Ui';
import { useToast } from '../../context/ToastContext';
import { formatTanggal } from '../../utils/format';

export default function UserReviewsPage() {
  const { showToast } = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    api
      .get('/review/saya', { signal: controller.signal })
      .then((res) => setReviews(res.data.data || []))
      .catch((err) => {
        const msg = getErrorMessage(err, 'Gagal memuat review Anda.');
        if (msg) showToast(msg, 'error');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [showToast]);

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>Review Saya</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Ulasan yang pernah Anda berikan setelah booking selesai.
          </p>
        </div>
        <Link to="/booking-saya" className="btn btn-secondary">
          Ke Booking Saya
        </Link>
      </div>

      {loading ? (
        <Spinner label="Memuat review Anda..." />
      ) : reviews.length === 0 ? (
        <EmptyState
          title="Anda belum memberi review"
          description="Review bisa diberikan dari halaman Booking Saya setelah booking berstatus Selesai."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {reviews.map((rv) => (
            <article
              key={rv.review_id}
              className="card"
              style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}
            >
              <KosImage
                path={rv.foto}
                alt={`Foto ${rv.nama_kos}`}
                className="kos-card-thumb"
              />
              <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <h3 style={{ marginBottom: 2 }}>
                      {rv.status_kos === 'Aktif' ? (
                        <Link to={`/kos/${rv.kos_id}`}>{rv.nama_kos}</Link>
                      ) : (
                        rv.nama_kos
                      )}
                    </h3>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Kamar No. {rv.no_kamar} - {rv.tipe_kamar}
                      {rv.status_kos !== 'Aktif' && ' · Kos sedang tidak ditampilkan'}
                    </div>
                  </div>
                  <StarRating value={rv.rating} readOnly />
                </div>
                <p style={{ margin: '8px 0 4px' }}>
                  {rv.komentar || <em style={{ color: 'var(--text-muted)' }}>Tanpa komentar.</em>}
                </p>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Ditulis {formatTanggal(rv.tanggal)}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
