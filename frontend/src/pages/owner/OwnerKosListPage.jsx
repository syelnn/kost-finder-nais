import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../../api/client';
import AppLayout from '../../components/AppLayout';
import { EmptyState, KosImage, Modal, Spinner, StatusBadge } from '../../components/Ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatRating, formatRupiah } from '../../utils/format';
import { Plus, DoorOpen, Pencil, Eye, EyeOff, Trash2, Star } from 'lucide-react';

export default function OwnerKosListPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [kosList, setKosList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const loadKos = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/owner/kos');
      setKosList(data.data || []);
    } catch (err) {
      showToast(getErrorMessage(err, 'Gagal memuat daftar kos.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadKos();
  }, [loadKos]);

  const handleToggleStatus = async (kos) => {
    const nextStatus = kos.status_verifikasi === 'Aktif' ? 'Nonaktif' : 'Aktif';
    setTogglingId(kos.kos_id);
    try {
      const { data } = await api.patch(`/owner/kos/${kos.kos_id}/status`, { status: nextStatus });
      showToast(data.message || 'Status kos diperbarui.', 'success');
      loadKos();
    } catch (err) {
      showToast(getErrorMessage(err, 'Gagal mengubah status publikasi kos.'), 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { data } = await api.delete(`/owner/kos/${deleteTarget.kos_id}`);
      showToast(data.message || 'Kos berhasil dihapus.', 'success');
      setDeleteTarget(null);
      loadKos();
    } catch (err) {
      showToast(getErrorMessage(err, 'Gagal menghapus kos.'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const isVerified = user?.status_verifikasi === 'Terverifikasi';

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>Daftar Kos Saya</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Kelola data properti kos, foto, fasilitas, ketersediaan kamar, dan status publikasi di peta.
          </p>
        </div>
        <Link to="/owner/kos/baru" className="btn btn-primary">
          <Plus className="icon" />
          Tambah Kos Baru
        </Link>
      </div>

      {loading ? (
        <Spinner label="Memuat kos Anda..." />
      ) : kosList.length === 0 ? (
        <EmptyState
          title="Anda belum memiliki data kos"
          description="Mulai tambahkan kos pertama Anda lengkap dengan titik lokasi di peta."
          actionLabel={
            <>
              <Plus className="icon" />
              Tambah Kos Baru
            </>
          }
          onAction={() => navigate('/owner/kos/baru')}
        />
      ) : (
        <div className="kos-grid">
          {kosList.map((k) => (
            <div key={k.kos_id} className="card kos-card">
              <KosImage path={k.foto} alt={k.nama_kos} className="kos-card-thumb" />
              <div className="kos-card-head">
                <div>
                  <h3 style={{ marginBottom: 4 }}>{k.nama_kos}</h3>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.alamat}</div>
                </div>
                <div className="kos-card-badges">
                  <StatusBadge status={k.tipe_kos} />
                  <StatusBadge status={k.status_verifikasi} />
                </div>
              </div>

              <div className="kos-card-stats">
                <div>
                  <div>Harga Mulai</div>
                  <strong>{k.harga_mulai !== null ? formatRupiah(k.harga_mulai) : 'Belum ada'}</strong>
                </div>
                <div>
                  <div>Kamar Kosong</div>
                  <strong>
                    {k.kamar_kosong} / {k.jumlah_kamar}
                  </strong>
                </div>
                <div>
                  <div>Rating</div>
                  <strong>
                    <Star className="icon-star" /> {formatRating(k.rata_rating)}
                  </strong>
                </div>
              </div>

              <div className="kos-card-actions">
                <Link to={`/owner/kos/${k.kos_id}/kamar`} className="btn btn-primary btn-sm">
                  <DoorOpen className="icon" />
                  Kelola Kamar ({k.jumlah_kamar})
                </Link>
                <Link to={`/owner/kos/${k.kos_id}/edit`} className="btn btn-secondary btn-sm">
                  <Pencil className="icon" />
                  Edit Kos & Foto
                </Link>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={!isVerified || togglingId === k.kos_id}
                  title={
                    !isVerified
                      ? 'Akun Anda belum diverifikasi Admin'
                      : k.status_verifikasi === 'Aktif'
                      ? 'Nonaktifkan kos dari peta'
                      : 'Publikasikan kos ke peta'
                  }
                  onClick={() => handleToggleStatus(k)}
                >
                  {k.status_verifikasi === 'Aktif' ? <EyeOff className="icon" /> : <Eye className="icon" />}
                  {togglingId === k.kos_id
                    ? 'Memproses...'
                    : k.status_verifikasi === 'Aktif'
                    ? 'Nonaktifkan'
                    : 'Publikasikan'}
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => setDeleteTarget(k)}
                >
                  <Trash2 className="icon" />
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(deleteTarget)}
        title="Hapus Data Kos"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        confirmLabel="Ya, Hapus Kos"
        danger
        loading={deleting}
      >
        {deleteTarget && (
          <p>
            Apakah Anda yakin ingin menghapus <strong>{deleteTarget.nama_kos}</strong>? Seluruh kamar ({deleteTarget.jumlah_kamar}), foto ({deleteTarget.jumlah_foto}), booking, dan review pada kos ini akan ikut terhapus secara permanen.
          </p>
        )}
      </Modal>
    </AppLayout>
  );
}
