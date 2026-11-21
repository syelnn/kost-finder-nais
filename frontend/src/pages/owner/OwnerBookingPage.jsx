import React, { useCallback, useEffect, useState } from 'react';
import api, { downloadFile, getErrorMessage } from '../../api/client';
import AppLayout from '../../components/AppLayout';
import { EmptyState, Modal, Pagination, Spinner, StatusBadge } from '../../components/Ui';
import { useToast } from '../../context/ToastContext';
import { formatRupiah, formatTanggal } from '../../utils/format';
import { Check, CheckCheck, X, Download } from 'lucide-react';

export default function OwnerBookingPage() {
  const { showToast } = useToast();
  const [bookings, setBookings] = useState([]);
  const [kosList, setKosList] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [tipeFilter, setTipeFilter] = useState('');
  const [kosFilter, setKosFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [actionModal, setActionModal] = useState(null); // { booking, aksi: 'setujui' | 'tolak' | 'selesai' }
  const [processing, setProcessing] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (tipeFilter) params.tipe = tipeFilter;
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
  }, [statusFilter, tipeFilter, kosFilter, showToast]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleConfirmAction = async () => {
    if (!actionModal) return;
    setProcessing(true);
    try {
      const { booking, aksi } = actionModal;
      const { data } = await api.patch(`/owner/booking/${booking.booking_id}/${aksi}`);
      const isSurvey = booking.tipe_booking === 'survey';
      const updatedStatus =
        aksi === 'setujui' ? 'Disetujui' : aksi === 'tolak' ? 'Ditolak' : 'Selesai';
      const updatedKamarStatus = isSurvey
        ? booking.status_kamar
        : data?.data?.status_kamar || (aksi === 'setujui' ? 'Terisi' : 'Kosong');

      // Perbarui state segera tanpa menunggu refresh halaman penuh
      setBookings((prev) =>
        prev.map((item) =>
          item.booking_id === booking.booking_id
            ? {
                ...item,
                status_booking: updatedStatus,
                status_kamar: updatedKamarStatus,
              }
            : item
        )
      );

      const defaultMsg =
        aksi === 'selesai'
          ? 'Booking ditandai selesai'
          : aksi === 'setujui'
          ? isSurvey
            ? 'Booking survey disetujui. Status kamar tidak berubah.'
            : 'Booking kamar disetujui. Status kamar menjadi Terisi.'
          : isSurvey
          ? 'Booking survey ditolak.'
          : 'Booking kamar ditolak. Status kamar kembali Kosong.';
      showToast(aksi === 'selesai' ? 'Booking ditandai selesai' : data.message || defaultMsg, 'success');
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
        <div className="page-actions">
          <select
            className="form-control"
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
            value={tipeFilter}
            onChange={(e) => setTipeFilter(e.target.value)}
            aria-label="Filter berdasarkan jenis booking"
          >
            <option value="">Semua Jenis</option>
            <option value="survey">Survey</option>
            <option value="sewa">Sewa</option>
          </select>
          <select
            className="form-control"
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
                    <th>Jenis</th>
                    <th>Kos & Kamar</th>
                    <th>Pencari Kos</th>
                    <th>Tanggal Survey/Sewa</th>
                    <th>Status Booking</th>
                    <th>Status Kamar</th>
                    <th>Aksi</th>
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
                        <td data-label="Kos & Kamar" className="td-stack">
                          <strong>{b.nama_kos}</strong>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {b.no_kamar
                              ? `No. ${b.no_kamar} - Tipe ${b.tipe_kamar} (${formatRupiah(b.harga)}/bln)`
                              : 'Survey Umum (tanpa kamar spesifik)'}
                          </div>
                        </td>
                        <td data-label="Pencari Kos" className="td-stack">
                          <strong>{b.nama_user}</strong>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {b.email_user} {b.no_wa_user ? `· WA: ${b.no_wa_user}` : ''}
                          </div>
                        </td>
                        <td data-label="Tanggal Survey/Sewa">{formatTanggal(b.tanggal_survey)}</td>
                        <td data-label="Status Booking">
                          <StatusBadge status={b.status_booking} />
                        </td>
                        <td data-label="Status Kamar">
                          {isSurvey ? (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          ) : (
                            <StatusBadge status={b.status_kamar} />
                          )}
                        </td>
                        <td data-label="Aksi" className="td-aksi">
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            {b.status_booking === 'Menunggu' && (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={() => setActionModal({ booking: b, aksi: 'setujui' })}
                                >
                                  <Check className="icon" strokeWidth={2} aria-hidden="true" />
                                  Setujui
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-danger btn-sm"
                                  onClick={() => setActionModal({ booking: b, aksi: 'tolak' })}
                                >
                                  <X className="icon" strokeWidth={2} aria-hidden="true" />
                                  Tolak
                                </button>
                              </>
                            )}
                            {b.status_booking === 'Disetujui' && (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => setActionModal({ booking: b, aksi: 'selesai' })}
                              >
                                <CheckCheck className="icon" strokeWidth={2} aria-hidden="true" />
                                Selesai
                              </button>
                            )}
                            {['Disetujui', 'Selesai'].includes(b.status_booking) && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                disabled={downloadingId === b.booking_id}
                                onClick={() => handleDownloadBukti(b.booking_id)}
                              >
                                {downloadingId !== b.booking_id && <Download className="icon" strokeWidth={2} aria-hidden="true" />}
                                {downloadingId === b.booking_id ? 'Mengunduh...' : 'Bukti PDF'}
                              </button>
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
        open={Boolean(actionModal)}
        title={
          actionModal?.aksi === 'setujui'
            ? 'Setujui Pengajuan Booking'
            : actionModal?.aksi === 'tolak'
            ? 'Tolak Pengajuan Booking'
            : 'Selesaikan booking ini?'
        }
        onClose={() => setActionModal(null)}
        onConfirm={handleConfirmAction}
        confirmLabel={
          actionModal?.aksi === 'setujui'
            ? 'Ya, Setujui Booking'
            : actionModal?.aksi === 'tolak'
            ? 'Ya, Tolak Booking'
            : 'Ya, Selesai'
        }
        cancelLabel="Batal"
        danger={actionModal?.aksi === 'tolak'}
        loading={processing}
      >
        {actionModal && (
          <div>
            {actionModal.aksi === 'setujui' ? (
              <p>
                {actionModal.booking.tipe_booking === 'survey' ? (
                  <>
                    Setujui <strong>booking survey</strong> dari <strong>{actionModal.booking.nama_user}</strong> untuk{' '}
                    <strong>{actionModal.booking.nama_kos}</strong>
                    {actionModal.booking.no_kamar ? ` (Kamar No. ${actionModal.booking.no_kamar})` : ''}? Status kamar{' '}
                    <strong>tidak akan berubah</strong> dan Bukti Konfirmasi Booking Survey (PDF) dapat diunduh.
                  </>
                ) : (
                  <>
                    Setujui <strong>booking kamar</strong> dari <strong>{actionModal.booking.nama_user}</strong> untuk{' '}
                    <strong>
                      {actionModal.booking.nama_kos} (Kamar No. {actionModal.booking.no_kamar})
                    </strong>
                    ? Status kamar akan otomatis berubah menjadi <strong>Terisi</strong> dan Bukti Konfirmasi Booking Kamar (PDF) dapat diunduh.
                  </>
                )}
              </p>
            ) : actionModal.aksi === 'tolak' ? (
              <p>
                Tolak {actionModal.booking.tipe_booking === 'survey' ? 'booking survey' : 'booking kamar'} dari{' '}
                <strong>{actionModal.booking.nama_user}</strong> untuk{' '}
                <strong>
                  {actionModal.booking.nama_kos}
                  {actionModal.booking.no_kamar ? ` (Kamar No. ${actionModal.booking.no_kamar})` : ''}
                </strong>
                ?{' '}
                {actionModal.booking.tipe_booking === 'survey'
                  ? 'Status kamar tetap tidak berubah.'
                  : 'Status kamar akan otomatis kembali menjadi Kosong.'}
              </p>
            ) : (
              <>
                <p style={{ marginBottom: 12 }}>
                  {actionModal.booking.tipe_booking === 'survey'
                    ? 'Survey lokasi sudah selesai dilakukan? Setelah dikonfirmasi, status booking survey menjadi Selesai tanpa mengubah status kamar.'
                    : 'Kos/kamar sudah selesai dihuni? Setelah dikonfirmasi, kamar kembali berstatus Kosong dan penyewa dapat memberikan review.'}
                </p>
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: '#f8fafc',
                    border: '1px solid var(--border)',
                    fontSize: 13.5,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Jenis Booking: </span>
                    <strong>{actionModal.booking.tipe_booking === 'survey' ? 'Booking Survey' : 'Booking Kamar (Sewa)'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Nama Kos: </span>
                    <strong>{actionModal.booking.nama_kos}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Nomor Kamar: </span>
                    <strong>
                      {actionModal.booking.no_kamar
                        ? `No. ${actionModal.booking.no_kamar} (${actionModal.booking.tipe_kamar})`
                        : 'Survey Umum'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Nama Penyewa: </span>
                    <strong>{actionModal.booking.nama_user}</strong>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
