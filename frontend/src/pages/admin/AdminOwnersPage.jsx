import React, { useCallback, useEffect, useState } from 'react';
import api, { getErrorMessage } from '../../api/client';
import AppLayout from '../../components/AppLayout';
import { EmptyState, Modal, Pagination, Spinner, StatusBadge } from '../../components/Ui';
import { useToast } from '../../context/ToastContext';

export default function AdminOwnersPage() {
  const { showToast } = useToast();
  const [owners, setOwners] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState(null);
  const [processing, setProcessing] = useState(false);

  const loadOwners = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/owners', {
        params: statusFilter ? { status: statusFilter } : {},
      });
      setOwners(data.data || []);
      setPage(1);
    } catch (err) {
      showToast(getErrorMessage(err, 'Gagal memuat daftar pemilik kos.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showToast]);

  useEffect(() => {
    loadOwners();
  }, [loadOwners]);

  const handleConfirm = async () => {
    if (!target) return;
    setProcessing(true);
    try {
      const nextStatus = target.status_verifikasi === 'Menunggu' ? 'Terverifikasi' : 'Menunggu';
      const { data } = await api.patch(`/admin/owners/${target.user_id}/verifikasi`, {
        status: nextStatus,
      });
      showToast(data.message || 'Status verifikasi diperbarui.', 'success');
      setTarget(null);
      loadOwners();
    } catch (err) {
      showToast(getErrorMessage(err, 'Gagal mengubah status verifikasi.'), 'error');
    } finally {
      setProcessing(false);
    }
  };

  const pageSize = 10;
  const paged = owners.slice((page - 1) * pageSize, page * pageSize);

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>Verifikasi Akun Pemilik Kos (Owner)</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Owner harus berstatus Terverifikasi sebelum dapat mempublikasikan kos ke peta.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <label htmlFor="filter-status-owner" style={{ fontSize: 13, fontWeight: 600 }}>
            Status:
          </label>
          <select
            id="filter-status-owner"
            className="form-control"
            style={{ width: 180 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Semua Status</option>
            <option value="Menunggu">Menunggu</option>
            <option value="Terverifikasi">Terverifikasi</option>
          </select>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <Spinner label="Memuat daftar pemilik kos..." />
        ) : owners.length === 0 ? (
          <EmptyState
            title="Tidak ada akun Pemilik Kos"
            description="Belum ada pemilik kos dengan filter status yang dipilih."
          />
        ) : (
          <>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nama Pemilik</th>
                    <th>Email</th>
                    <th>No. WhatsApp</th>
                    <th>Jumlah Kos</th>
                    <th>Kos Aktif</th>
                    <th>Status Verifikasi</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((o) => (
                    <tr key={o.user_id}>
                      <td>#{o.user_id}</td>
                      <td>
                        <strong>{o.nama}</strong>
                      </td>
                      <td>{o.email}</td>
                      <td>{o.no_wa || '-'}</td>
                      <td>{o.jumlah_kos} kos</td>
                      <td>{o.kos_aktif} aktif</td>
                      <td>
                        <StatusBadge status={o.status_verifikasi} />
                      </td>
                      <td>
                        {o.status_verifikasi === 'Menunggu' ? (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => setTarget(o)}
                          >
                            Verifikasi
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setTarget(o)}
                          >
                            Batalkan Verifikasi
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalItems={owners.length} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </div>

      <Modal
        open={Boolean(target)}
        title={
          target?.status_verifikasi === 'Menunggu'
            ? 'Verifikasi Akun Pemilik Kos'
            : 'Batalkan Verifikasi Pemilik Kos'
        }
        onClose={() => setTarget(null)}
        onConfirm={handleConfirm}
        confirmLabel={
          target?.status_verifikasi === 'Menunggu' ? 'Ya, Verifikasi' : 'Ya, Batalkan Verifikasi'
        }
        danger={target?.status_verifikasi === 'Terverifikasi'}
        loading={processing}
      >
        {target &&
          (target.status_verifikasi === 'Menunggu' ? (
            <p>
              Apakah Anda yakin ingin memverifikasi akun <strong>{target.nama}</strong> ({target.email})? Setelah diverifikasi, pemilik kos dapat mempublikasikan kos miliknya ke peta.
            </p>
          ) : (
            <p>
              Batalkan verifikasi akun <strong>{target.nama}</strong>? Status akun akan kembali menjadi <strong>Menunggu</strong> dan seluruh kos aktif miliknya ({target.kos_aktif} kos) akan otomatis diubah menjadi <strong>Nonaktif</strong>.
            </p>
          ))}
      </Modal>
    </AppLayout>
  );
}
