import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { getErrorMessage, getFieldErrors } from '../../api/client';
import AppLayout from '../../components/AppLayout';
import { EmptyState, Modal, Spinner, StatusBadge } from '../../components/Ui';
import { useToast } from '../../context/ToastContext';
import { formatRupiah } from '../../utils/format';

export default function OwnerKamarPage() {
  const { id } = useParams();
  const { showToast } = useToast();

  const [kosInfo, setKosInfo] = useState(null);
  const [kamarList, setKamarList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    no_kamar: '',
    tipe_kamar: 'Standar',
    harga: '',
    status_kamar: 'Kosong',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({
    no_kamar: '',
    tipe_kamar: '',
    harga: '',
    status_kamar: 'Kosong',
  });
  const [editErrors, setEditErrors] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadKamar = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/owner/kos/${id}/kamar`);
      setKosInfo(data.data.kos);
      setKamarList(data.data.kamar || []);
    } catch (err) {
      showToast(getErrorMessage(err, 'Gagal memuat daftar kamar.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    loadKamar();
  }, [loadKamar]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      const { data } = await api.post(`/owner/kos/${id}/kamar`, {
        no_kamar: form.no_kamar,
        tipe_kamar: form.tipe_kamar,
        harga: form.harga === '' ? '' : Number(form.harga),
        status_kamar: form.status_kamar,
      });
      showToast(data.message || 'Kamar berhasil ditambahkan.', 'success');
      setForm({ no_kamar: '', tipe_kamar: 'Standar', harga: '', status_kamar: 'Kosong' });
      loadKamar();
    } catch (err) {
      setErrors(getFieldErrors(err));
      showToast(getErrorMessage(err, 'Gagal menambah kamar.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (km) => {
    setEditItem(km);
    setEditForm({
      no_kamar: km.no_kamar,
      tipe_kamar: km.tipe_kamar,
      harga: km.harga,
      status_kamar: km.status_kamar === 'Dalam Booking' ? 'Kosong' : km.status_kamar,
    });
    setEditErrors({});
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    setEditErrors({});
    setSavingEdit(true);
    try {
      const payload = {
        no_kamar: editForm.no_kamar,
        tipe_kamar: editForm.tipe_kamar,
        harga: Number(editForm.harga),
      };
      if (!editItem.ada_booking_aktif && editItem.status_kamar !== 'Dalam Booking') {
        payload.status_kamar = editForm.status_kamar;
      }
      const { data } = await api.put(`/owner/kamar/${editItem.kamar_id}`, payload);
      showToast(data.message || 'Data kamar diperbarui.', 'success');
      setEditItem(null);
      loadKamar();
    } catch (err) {
      setEditErrors(getFieldErrors(err));
      showToast(getErrorMessage(err, 'Gagal memperbarui kamar.'), 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { data } = await api.delete(`/owner/kamar/${deleteTarget.kamar_id}`);
      showToast(data.message || 'Kamar dihapus.', 'success');
      setDeleteTarget(null);
      loadKamar();
    } catch (err) {
      showToast(getErrorMessage(err, 'Gagal menghapus kamar.'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>Kelola Kamar — {kosInfo ? kosInfo.nama_kos : `Kos #${id}`}</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Nomor kamar unik per kos. Status <em>Dalam Booking</em> diatur otomatis oleh sistem saat pencari kos mengajukan booking.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to={`/owner/kos/${id}/edit`} className="btn btn-secondary">
            Edit Info Kos
          </Link>
          <Link to="/owner/kos" className="btn btn-secondary">
            Kembali ke Daftar Kos
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Tambah Kamar Baru</h3>
        <form onSubmit={handleAdd} noValidate style={{ marginTop: 12 }}>
          <div className="form-row" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
            <div className="form-group">
              <label htmlFor="km-no">No. Kamar</label>
              <input
                id="km-no"
                type="text"
                className={`form-control ${errors.no_kamar ? 'is-invalid' : ''}`}
                placeholder="Contoh: A1 / 10"
                value={form.no_kamar}
                onChange={(e) => setForm((p) => ({ ...p, no_kamar: e.target.value }))}
                required
              />
              {errors.no_kamar && <div className="field-error">{errors.no_kamar}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="km-tipe">Tipe Kamar</label>
              <input
                id="km-tipe"
                type="text"
                className={`form-control ${errors.tipe_kamar ? 'is-invalid' : ''}`}
                placeholder="Contoh: Standar / Deluxe"
                value={form.tipe_kamar}
                onChange={(e) => setForm((p) => ({ ...p, tipe_kamar: e.target.value }))}
                required
              />
              {errors.tipe_kamar && <div className="field-error">{errors.tipe_kamar}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="km-harga">Harga per Bulan (Rp)</label>
              <input
                id="km-harga"
                type="number"
                min="0"
                step="50000"
                className={`form-control ${errors.harga ? 'is-invalid' : ''}`}
                placeholder="1200000"
                value={form.harga}
                onChange={(e) => setForm((p) => ({ ...p, harga: e.target.value }))}
                required
              />
              {errors.harga && <div className="field-error">{errors.harga}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="km-status">Status Awal</label>
              <select
                id="km-status"
                className="form-control"
                value={form.status_kamar}
                onChange={(e) => setForm((p) => ({ ...p, status_kamar: e.target.value }))}
              >
                <option value="Kosong">Kosong</option>
                <option value="Terisi">Terisi</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Menyimpan...' : '+ Tambah Kamar'}
          </button>
        </form>
      </div>

      <div className="card">
        {loading ? (
          <Spinner label="Memuat daftar kamar..." />
        ) : kamarList.length === 0 ? (
          <EmptyState
            title="Belum ada kamar di kos ini"
            description="Tambahkan minimal satu kamar agar kos memiliki harga mulai dan dapat dibooking."
          />
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>No. Kamar</th>
                  <th>Tipe Kamar</th>
                  <th>Harga / Bulan</th>
                  <th>Status Kamar</th>
                  <th>Keterangan</th>
                  <th style={{ width: 180 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {kamarList.map((km) => (
                  <tr key={km.kamar_id}>
                    <td>
                      <strong>No. {km.no_kamar}</strong>
                    </td>
                    <td>{km.tipe_kamar}</td>
                    <td>
                      <strong>{formatRupiah(km.harga)}</strong>
                    </td>
                    <td>
                      <StatusBadge status={km.status_kamar} />
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {km.ada_booking_aktif
                        ? 'Terkunci oleh booking aktif (otomatis)'
                        : 'Dapat diubah manual Kosong ↔ Terisi'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEdit(km)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => setDeleteTarget(km)}
                        >
                          Hapus
                        </button>
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
        open={Boolean(editItem)}
        title={`Edit Kamar No. ${editItem?.no_kamar || ''}`}
        onClose={() => setEditItem(null)}
        onConfirm={handleSaveEdit}
        confirmLabel="Simpan Perubahan"
        loading={savingEdit}
      >
        {editItem && (
          <div>
            <div className="form-group">
              <label htmlFor="ed-no">No. Kamar</label>
              <input
                id="ed-no"
                type="text"
                className={`form-control ${editErrors.no_kamar ? 'is-invalid' : ''}`}
                value={editForm.no_kamar}
                onChange={(e) => setEditForm((p) => ({ ...p, no_kamar: e.target.value }))}
              />
              {editErrors.no_kamar && <div className="field-error">{editErrors.no_kamar}</div>}
            </div>
            <div className="form-group">
              <label htmlFor="ed-tipe">Tipe Kamar</label>
              <input
                id="ed-tipe"
                type="text"
                className={`form-control ${editErrors.tipe_kamar ? 'is-invalid' : ''}`}
                value={editForm.tipe_kamar}
                onChange={(e) => setEditForm((p) => ({ ...p, tipe_kamar: e.target.value }))}
              />
              {editErrors.tipe_kamar && <div className="field-error">{editErrors.tipe_kamar}</div>}
            </div>
            <div className="form-group">
              <label htmlFor="ed-harga">Harga / Bulan (Rp)</label>
              <input
                id="ed-harga"
                type="number"
                min="0"
                className={`form-control ${editErrors.harga ? 'is-invalid' : ''}`}
                value={editForm.harga}
                onChange={(e) => setEditForm((p) => ({ ...p, harga: e.target.value }))}
              />
              {editErrors.harga && <div className="field-error">{editErrors.harga}</div>}
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="ed-status">Status Kamar</label>
              {editItem.ada_booking_aktif || editItem.status_kamar === 'Dalam Booking' ? (
                <div className="field-hint">
                  Status saat ini <strong>{editItem.status_kamar}</strong> (memiliki booking aktif sehingga dikelola otomatis lewat menu Approval Booking).
                </div>
              ) : (
                <select
                  id="ed-status"
                  className="form-control"
                  value={editForm.status_kamar}
                  onChange={(e) => setEditForm((p) => ({ ...p, status_kamar: e.target.value }))}
                >
                  <option value="Kosong">Kosong</option>
                  <option value="Terisi">Terisi</option>
                </select>
              )}
              {editErrors.status_kamar && <div className="field-error">{editErrors.status_kamar}</div>}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        title="Hapus Kamar"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        confirmLabel="Ya, Hapus Kamar"
        danger
        loading={deleting}
      >
        {deleteTarget && (
          <p>
            Apakah Anda yakin ingin menghapus <strong>Kamar No. {deleteTarget.no_kamar}</strong> ({deleteTarget.tipe_kamar}) beserta riwayat bookingnya?
          </p>
        )}
      </Modal>
    </AppLayout>
  );
}
