import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { getErrorMessage, getFieldErrors } from '../../api/client';
import AppLayout from '../../components/AppLayout';
import LocationPickerMap from '../../components/LocationPickerMap';
import { KosImage, Modal, Spinner } from '../../components/Ui';
import { useToast } from '../../context/ToastContext';
import { DoorOpen, Trash2, Upload, Save, X } from 'lucide-react';
import '../../styles/owner/pages.css';

export default function OwnerKosFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [masterFasilitas, setMasterFasilitas] = useState([]);

  const [form, setForm] = useState({
    nama_kos: '',
    alamat: '',
    latitude: '',
    longitude: '',
    tipe_kos: 'Campur',
    fasilitas: [],
  });
  const [errors, setErrors] = useState({});

  const [existingFotos, setExistingFotos] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [deleteFotoTarget, setDeleteFotoTarget] = useState(null);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const fasRes = await api.get('/fasilitas');
      setMasterFasilitas(fasRes.data.data || []);

      if (isEdit) {
        const { data } = await api.get(`/owner/kos/${id}`);
        const k = data.data;
        setForm({
          nama_kos: k.nama_kos || '',
          alamat: k.alamat || '',
          latitude: k.latitude ?? '',
          longitude: k.longitude ?? '',
          tipe_kos: k.tipe_kos || 'Campur',
          fasilitas: (k.fasilitas || []).map((f) => f.fasilitas_id),
        });
        setExistingFotos(k.foto || []);
      }
    } catch (err) {
      showToast(getErrorMessage(err, 'Gagal memuat data kos.'), 'error');
      if (isEdit) navigate('/owner/kos');
    } finally {
      setLoading(false);
    }
  }, [id, isEdit, navigate, showToast]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const toggleFasilitas = (fasId) => {
    setForm((prev) => {
      const exists = prev.fasilitas.includes(fasId);
      return {
        ...prev,
        fasilitas: exists ? prev.fasilitas.filter((x) => x !== fasId) : [...prev.fasilitas, fasId],
      };
    });
  };

  const handleMapSelect = (lat, lng) => {
    setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));
    setErrors((prev) => ({ ...prev, latitude: undefined, longitude: undefined }));
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    const remainingSlots = Math.max(0, 5 - existingFotos.length);
    if (selected.length > remainingSlots) {
      showToast(`Maksimal 5 foto per kos. Sisa slot: ${remainingSlots}.`, 'error');
      setNewFiles(selected.slice(0, remainingSlots));
      return;
    }
    setNewFiles(selected);
  };

  const uploadPhotosForKos = async (kosId, filesToUpload) => {
    if (!filesToUpload.length) return;
    const fd = new FormData();
    filesToUpload.forEach((f) => fd.append('foto', f));
    await api.post(`/owner/kos/${kosId}/foto`, fd);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      const payload = {
        nama_kos: form.nama_kos,
        alamat: form.alamat,
        latitude: form.latitude === '' ? null : Number(form.latitude),
        longitude: form.longitude === '' ? null : Number(form.longitude),
        tipe_kos: form.tipe_kos,
        fasilitas: form.fasilitas,
      };

      if (isEdit) {
        const { data } = await api.put(`/owner/kos/${id}`, payload);
        if (newFiles.length) {
          await uploadPhotosForKos(id, newFiles);
          setNewFiles([]);
        }
        showToast(data.message || 'Data kos berhasil diperbarui.', 'success');
        loadInitial();
      } else {
        const { data } = await api.post('/owner/kos', payload);
        const createdId = data.data.kos_id;
        if (newFiles.length) {
          try {
            await uploadPhotosForKos(createdId, newFiles);
          } catch (upErr) {
            showToast(getErrorMessage(upErr, 'Kos tersimpan namun upload foto gagal.'), 'error');
          }
        }
        showToast(data.message || 'Kos berhasil ditambahkan.', 'success');
        navigate(`/owner/kos/${createdId}/kamar`);
      }
    } catch (err) {
      setErrors(getFieldErrors(err));
      showToast(getErrorMessage(err, 'Gagal menyimpan data kos.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadOnly = async () => {
    if (!isEdit || !newFiles.length) return;
    setUploadingFoto(true);
    try {
      await uploadPhotosForKos(id, newFiles);
      showToast('Foto berhasil diunggah.', 'success');
      setNewFiles([]);
      loadInitial();
    } catch (err) {
      showToast(getErrorMessage(err, 'Gagal mengunggah foto.'), 'error');
    } finally {
      setUploadingFoto(false);
    }
  };

  const handleDeleteFoto = async () => {
    if (!deleteFotoTarget) return;
    setUploadingFoto(true);
    try {
      const { data } = await api.delete(`/owner/foto/${deleteFotoTarget.foto_id}`);
      showToast(data.message || 'Foto dihapus.', 'success');
      setDeleteFotoTarget(null);
      loadInitial();
    } catch (err) {
      showToast(getErrorMessage(err, 'Gagal menghapus foto.'), 'error');
    } finally {
      setUploadingFoto(false);
    }
  };

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>{isEdit ? 'Edit Data Kos' : 'Tambah Kos Baru'}</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Isi informasi kos, klik peta untuk menentukan koordinat, pilih fasilitas, dan unggah foto (1–5 foto).
          </p>
        </div>
        <div className="page-actions">
          {isEdit && (
            <Link to={`/owner/kos/${id}/kamar`} className="btn btn-ghost">
              <DoorOpen className="icon" />
              Kelola Kamar Kos Ini
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <Spinner label="Memuat formulir kos..." />
      ) : (
        <form onSubmit={handleSubmit} className="card" noValidate>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="kos-nama">Nama Kos</label>
              <input
                id="kos-nama"
                type="text"
                className={`form-control ${errors.nama_kos ? 'is-invalid' : ''}`}
                placeholder="Contoh: Kos Melati Asri"
                value={form.nama_kos}
                onChange={(e) => setForm((p) => ({ ...p, nama_kos: e.target.value }))}
                required
              />
              {errors.nama_kos && <div className="field-error">{errors.nama_kos}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="kos-tipe">Tipe Kos</label>
              <select
                id="kos-tipe"
                className={`form-control ${errors.tipe_kos ? 'is-invalid' : ''}`}
                value={form.tipe_kos}
                onChange={(e) => setForm((p) => ({ ...p, tipe_kos: e.target.value }))}
              >
                <option value="Putra">Putra</option>
                <option value="Putri">Putri</option>
                <option value="Campur">Campur</option>
              </select>
              {errors.tipe_kos && <div className="field-error">{errors.tipe_kos}</div>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="kos-alamat">Alamat Lengkap (Format: Jalan, Kecamatan, Kota/Kabupaten)</label>
            <textarea
              id="kos-alamat"
              className={`form-control ${errors.alamat ? 'is-invalid' : ''}`}
              placeholder="Contoh: Jl. Dipati Ukur No. 21, Kecamatan Coblong, Kota Bandung"
              value={form.alamat}
              onChange={(e) => setForm((p) => ({ ...p, alamat: e.target.value }))}
              required
            />
            <div className="field-hint">
              Wajib memuat minimal 2 tanda koma: <em>Jalan, Kecamatan, Kota/Kabupaten</em>. Segmen terakhir menjadi wilayah laporan.
            </div>
            {errors.alamat && <div className="field-error">{errors.alamat}</div>}
          </div>

          <div className="form-group">
            <label>Titik Lokasi di Peta Interaktif (Klik Peta)</label>
            <LocationPickerMap
              latitude={form.latitude}
              longitude={form.longitude}
              onSelect={handleMapSelect}
            />
            <div className="form-row" style={{ marginTop: 10 }}>
              <div>
                <label htmlFor="kos-lat">Latitude (otomatis)</label>
                <input
                  id="kos-lat"
                  type="text"
                  className={`form-control ${errors.latitude ? 'is-invalid' : ''}`}
                  value={form.latitude}
                  readOnly
                  placeholder="Klik peta untuk mengisi latitude"
                />
                {errors.latitude && <div className="field-error">{errors.latitude}</div>}
              </div>
              <div>
                <label htmlFor="kos-lng">Longitude (otomatis)</label>
                <input
                  id="kos-lng"
                  type="text"
                  className={`form-control ${errors.longitude ? 'is-invalid' : ''}`}
                  value={form.longitude}
                  readOnly
                  placeholder="Klik peta untuk mengisi longitude"
                />
                {errors.longitude && <div className="field-error">{errors.longitude}</div>}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Fasilitas Kos (Checklist)</label>
            <div className="checklist-grid">
              {masterFasilitas.map((f) => {
                const checked = form.fasilitas.includes(f.fasilitas_id);
                return (
                  <label
                    key={f.fasilitas_id}
                    className={`check-pill ${checked ? 'checked' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleFasilitas(f.fasilitas_id)}
                    />
                    <span>{f.nama_fasilitas}</span>
                  </label>
                );
              })}
            </div>
            {!loading && masterFasilitas.length === 0 && (
              <div className="field-hint">
                Daftar fasilitas masih kosong. Admin perlu menambahkannya terlebih dahulu di menu Master Fasilitas.
              </div>
            )}

            {errors.fasilitas && <div className="field-error">{errors.fasilitas}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="kos-foto">
              Foto Kos (JPG/PNG/WEBP, maks. 2 MB per file, total maks. 5 foto)
            </label>
            {existingFotos.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                {existingFotos.map((ft) => (
                  <div
                    key={ft.foto_id}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      padding: 6,
                      background: '#f8fafc',
                    }}
                  >
                    <KosImage
                      path={ft.path_foto}
                      alt="Foto kos"
                      className="kos-card-thumb kos-foto-thumb"
                    />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, wordBreak: 'break-all' }}>
                      {ft.path_foto}
                    </div>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm btn-block"
                      style={{ marginTop: 6 }}
                      onClick={() => setDeleteFotoTarget(ft)}
                    >
                      <Trash2 className="icon" />
                      Hapus Foto
                    </button>
                  </div>
                ))}
              </div>
            )}

            {existingFotos.length < 5 ? (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  id="kos-foto"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="form-control"
                  style={{ maxWidth: 420 }}
                  onChange={handleFileChange}
                />
                {isEdit && newFiles.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={handleUploadOnly}
                    disabled={uploadingFoto}
                  >
                    {!uploadingFoto && <Upload className="icon" />}
                    {uploadingFoto ? 'Mengunggah...' : `Unggah ${newFiles.length} Foto Sekarang`}
                  </button>
                )}
              </div>
            ) : (
              <div className="field-hint">Batas maksimal 5 foto telah tercapai. Hapus salah satu foto jika ingin mengganti.</div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <Link to="/owner/kos" className="btn btn-secondary">
              <X className="icon" />
              Batal
            </Link>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {!saving && <Save className="icon" />}
              {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan & Lanjut ke Kamar'}
            </button>
          </div>
        </form>
      )}

      <Modal
        open={Boolean(deleteFotoTarget)}
        title="Hapus Foto Kos"
        onClose={() => setDeleteFotoTarget(null)}
        onConfirm={handleDeleteFoto}
        confirmLabel="Ya, Hapus Foto"
        danger
        loading={uploadingFoto}
      >
        <p>Apakah Anda yakin ingin menghapus foto ini dari kos Anda?</p>
      </Modal>
    </AppLayout>
  );
}