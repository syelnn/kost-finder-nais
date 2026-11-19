import React, { useCallback, useEffect, useState } from 'react';
import api, { getErrorMessage, getFieldErrors } from '../../api/client';
import AppLayout from '../../components/AppLayout';
import { EmptyState, Modal, Spinner } from '../../components/Ui';
import { useToast } from '../../context/ToastContext';
import { Plus } from 'lucide-react';

export default function AdminFasilitasPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [namaBaru, setNamaBaru] = useState('');
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);

  const [editItem, setEditItem] = useState(null);
  const [editNama, setEditNama] = useState('');
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadFasilitas = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/fasilitas');
      setItems(data.data || []);
    } catch (err) {
      showToast(getErrorMessage(err, 'Gagal memuat master fasilitas.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadFasilitas();
  }, [loadFasilitas]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setAddError('');
    setAdding(true);
    try {
      const { data } = await api.post('/fasilitas', { nama_fasilitas: namaBaru });
      showToast(data.message || 'Fasilitas ditambahkan.', 'success');
      setNamaBaru('');
      loadFasilitas();
    } catch (err) {
      const fe = getFieldErrors(err);
      setAddError(fe.nama_fasilitas || getErrorMessage(err));
      showToast(getErrorMessage(err, 'Gagal menambah fasilitas.'), 'error');
    } finally {
      setAdding(false);
    }
  };

  const openEdit = (item) => {
    setEditItem(item);
    setEditNama(item.nama_fasilitas);
    setEditError('');
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    setEditError('');
    setSavingEdit(true);
    try {
      const { data } = await api.put(`/fasilitas/${editItem.fasilitas_id}`, {
        nama_fasilitas: editNama,
      });
      showToast(data.message || 'Fasilitas diperbarui.', 'success');
      setEditItem(null);
      loadFasilitas();
    } catch (err) {
      const fe = getFieldErrors(err);
      setEditError(fe.nama_fasilitas || getErrorMessage(err));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      const { data } = await api.delete(`/fasilitas/${deleteItem.fasilitas_id}`);
      showToast(data.message || 'Fasilitas dihapus.', 'success');
      setDeleteItem(null);
      loadFasilitas();
    } catch (err) {
      showToast(getErrorMessage(err, 'Gagal menghapus fasilitas.'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>Master Data Fasilitas</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Kelola daftar fasilitas kos yang dapat dipilih oleh Pemilik Kos dan difilter oleh Pencari Kos.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Tambah Fasilitas Baru</h3>
        <form
          onSubmit={handleAdd}
          style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', marginTop: 10 }}
        >
          <div style={{ flex: '1 1 280px' }}>
            <input
              type="text"
              className={`form-control ${addError ? 'is-invalid' : ''}`}
              placeholder="Contoh: Dispenser Air, Balkon, Water Heater..."
              value={namaBaru}
              onChange={(e) => setNamaBaru(e.target.value)}
              aria-label="Nama fasilitas baru"
              required
            />
            {addError && <div className="field-error">{addError}</div>}
          </div>
          <button type="submit" className="btn btn-primary" disabled={adding}>
            {adding ? (
              'Menyimpan...'
            ) : (
              <>
                <Plus size={18} aria-hidden="true" />
                Tambah Fasilitas
              </>
            )}
          </button>
        </form>
      </div>

      <div className="card">
        {loading ? (
          <Spinner label="Memuat fasilitas..." />
        ) : items.length === 0 ? (
          <EmptyState title="Belum ada fasilitas" description="Tambahkan fasilitas pertama di atas." />
        ) : (
          <div className="table-responsive">
            <table className="table table-fasilitas">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nama Fasilitas</th>
                  <th>Digunakan Oleh</th>
                  <th style={{ width: 180 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((f) => (
                  <tr key={f.fasilitas_id}>
                    <td data-label="ID">#{f.fasilitas_id}</td>
                    <td data-label="Nama Fasilitas">
                      <strong>{f.nama_fasilitas}</strong>
                    </td>
                    <td data-label="Digunakan Oleh">{f.jumlah_kos} kos</td>
                    <td data-label="Aksi" className="td-aksi">
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEdit(f)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => setDeleteItem(f)}
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
        title="Edit Nama Fasilitas"
        onClose={() => setEditItem(null)}
        onConfirm={handleSaveEdit}
        confirmLabel="Simpan Perubahan"
        loading={savingEdit}
      >
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="edit-nama-fasilitas">Nama Fasilitas</label>
          <input
            id="edit-nama-fasilitas"
            type="text"
            className={`form-control ${editError ? 'is-invalid' : ''}`}
            value={editNama}
            onChange={(e) => setEditNama(e.target.value)}
          />
          {editError && <div className="field-error">{editError}</div>}
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteItem)}
        title="Hapus Fasilitas"
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        confirmLabel="Ya, Hapus"
        danger
        loading={deleting}
      >
        {deleteItem && (
          <p>
            Apakah Anda yakin ingin menghapus fasilitas <strong>{deleteItem.nama_fasilitas}</strong>? Saat ini fasilitas tersebut digunakan oleh <strong>{deleteItem.jumlah_kos} kos</strong> dan akan dilepas otomatis dari kos terkait.
          </p>
        )}
      </Modal>
    </AppLayout>
  );
}