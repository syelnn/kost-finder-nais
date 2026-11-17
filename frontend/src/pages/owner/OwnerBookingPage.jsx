import React, { useCallback, useEffect, useState } from 'react';
import api, { downloadFile, getErrorMessage } from '../../api/client';
import AppLayout from '../../components/AppLayout';
import { EmptyState, Modal, Pagination, Spinner, StatusBadge } from '../../components/Ui';
import { useToast } from '../../context/ToastContext';
import { formatRupiah, formatTanggal } from '../../utils/format';

export default function OwnerBookingPage() {
  const { showToast } = useToast();
  const [bookings, setBookings] = useState([]);
  const [kosList, setKosList] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [kosFilter, setKosFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [actionModal, setActionModal] = useState(null); // { booking, aksi: 'setujui' | 'tolak' }
  const [processing, setProcessing] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (kosFilter) params.kos_id = kosFilter;
      const [bkRes, kosRes] = await Promise.all([
        api.get('/owner/booking', { params }),
        api.get('/owner/kos'),
      ]);
      setBookings(bkRes.data.data || []);
      setKosList(kosRes.data.data || []);
      setPage(1);
    } catch (err) {
      showToast(getErrorMessage(err, 'Gagal memuat daftar booking.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, kosFilter, showToast]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleConfirmAction = async () => {
    if (!actionModal) return;
    setProcessing(true);
    try {
      const { booking, aksi } = actionModal;
      const { data } = await api.patch(`/owner/booking/${booking.booking_id}/${aksi}`);
      showToast(data.message || 'Status booking diperbarui.', 'success');
      setActionModal(null);
      loadBookings();
    } catch (err) {
      showToast(getErrorMessage(err, 'Gagal memproses booking.'), 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadBukti = async (bookingId) => {
    setDownloadingId(bookingId);
    try {
      await downloadFile(
        `/booking/${bookingId}/bukti`,
        `bukti-booking-${String(bookingId).padStart(5, '0')}.pdf`
      );
      showToast('Bukti konfirmasi booking berhasil diunduh.', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Gagal mengunduh bukti konfirmasi.'), 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const pageSize = 10;
  const paged = bookings.slice((page - 1) * pageSize, page * pageSize);

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>Approval Booking Masuk</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Setujui atau tolak pengajuan booking dari pencari kos. Status kamar berubah otomatis tanpa refresh halaman.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select
            className="form-control"
            style={{ width: 200 }}
            value={kosFilter}
            onChange={(e) => setKosFilter(e.target.value)}
            aria-label="Filter berdasarkan kos"
          >
            <option value="">Semua Kos Saya</option>
            {kosList.map((k) => (
              <option key={k.kos_id} value={k.kos_id}>
                {k.nama_kos}
              </option>
            ))}
          </select>
          <select
            className="form-control"
            style={{ width: 170 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter berdasarkan status booking"
          >
            <option value="">Semua Status</option>
            <option value="Menunggu">Menunggu</option>
            <option value="Disetujui">Disetujui</option>
            <option value="Ditolak">Ditolak</option>
            <option value="Selesai">Selesai</option>
          </select>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <Spinner label="Memuat data booking..." />
        ) : bookings.length === 0 ? (
          <EmptyState
            title="Tidak ada data booking"
            description="Belum ada pengajuan booking yang sesuai dengan filter."
          />
        ) : (
          <>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Kos & Kamar</th>
                    <th>Pencari Kos</th>
                    <th>Tanggal Survey/Sewa</th>
                    <th>Status Booking</th>
                    <th>Status Kamar</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((b) => (
                    <tr key={b.booking_id}>
                      <td>#{b.booking_id}</td>
                      <td>
                        <strong>{b.nama_kos}</strong>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          No. {b.no_kamar} - Tipe {b.tipe_kamar} ({formatRupiah(b.harga)}/bln)
                        </div>
                      </td>
                      <td>
                        <strong>{b.nama_user}</strong>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {b.email_user} {b.no_wa_user ? `· WA: ${b.no_wa_user}` : ''}
                        </div>
                      </td>
                      <td>{formatTanggal(b.tanggal_survey)}</td>
                      <td>
                        <StatusBadge status={b.status_booking} />
                      </td>
                      <td>
                        <StatusBadge status={b.status_kamar} />
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {b.status_booking === 'Menunggu' && (
                            <>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => setActionModal({ booking: b, aksi: 'setujui' })}
                              >
                                Setujui
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => setActionModal({ booking: b, aksi: 'tolak' })}
                              >
                                Tolak
                              </button>
                            </>
                          )}
                          {['Disetujui', 'Selesai'].includes(b.status_booking) && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              disabled={downloadingId === b.booking_id}
                              onClick={() => handleDownloadBukti(b.booking_id)}
                            >
                              {downloadingId === b.booking_id ? 'Mengunduh...' : 'Bukti PDF'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalItems={bookings.length} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </div>

      <Modal
        open={Boolean(actionModal)}
        title={actionModal?.aksi === 'setujui' ? 'Setujui Pengajuan Booking' : 'Tolak Pengajuan Booking'}
        onClose={() => setActionModal(null)}
        onConfirm={handleConfirmAction}
        confirmLabel={actionModal?.aksi === 'setujui' ? 'Ya, Setujui Booking' : 'Ya, Tolak Booking'}
        danger={actionModal?.aksi === 'tolak'}
        loading={processing}
      >
        {actionModal && (
          <p>
            {actionModal.aksi === 'setujui' ? (
              <>
                Setujui booking dari <strong>{actionModal.booking.nama_user}</strong> untuk{' '}
                <strong>
                  {actionModal.booking.nama_kos} (Kamar No. {actionModal.booking.no_kamar})
                </strong>
                ? Status kamar akan otomatis berubah menjadi <strong>Terisi</strong> dan Bukti Konfirmasi Booking (PDF) dapat diunduh.
              </>
            ) : (
              <>
                Tolak booking dari <strong>{actionModal.booking.nama_user}</strong> untuk{' '}
                <strong>
                  {actionModal.booking.nama_kos} (Kamar No. {actionModal.booking.no_kamar})
                </strong>
                ? Status kamar akan otomatis kembali menjadi <strong>Kosong</strong>.
              </>
            )}
          </p>
        )}
      </Modal>
    </AppLayout>
  );
}
