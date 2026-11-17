import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, roleHomePath } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage, getFieldErrors } from '../../api/client';
import '../../styles/auth/auth.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nama: '',
    email: '',
    password: '',
    no_wa: '',
    role: 'User',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);
    try {
      const res = await register(form);
      showToast(res.message || 'Registrasi berhasil.', 'success');
      navigate(roleHomePath(res.data.user.role), { replace: true });
    } catch (err) {
      setErrors(getFieldErrors(err));
      showToast(getErrorMessage(err, 'Registrasi gagal. Periksa kembali isian Anda.'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <div className="auth-header">
          <Link to="/" className="brand-logo">
            <span className="brand-mark">⌂</span>
            <span>Kos Finder</span>
          </Link>
          <h1>Buat Akun Baru</h1>
          <p>Pilih peran sebagai Pencari Kos atau Pemilik Kos.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="reg-role">Daftar Sebagai</label>
            <div className="role-selector" role="radiogroup" aria-label="Pilih peran akun">
              <button
                type="button"
                className={`role-option ${form.role === 'User' ? 'active' : ''}`}
                onClick={() => setForm((p) => ({ ...p, role: 'User' }))}
              >
                <strong>Pencari Kos (User)</strong>
                <span>Langsung aktif mencari & booking kos</span>
              </button>
              <button
                type="button"
                className={`role-option ${form.role === 'Owner' ? 'active' : ''}`}
                onClick={() => setForm((p) => ({ ...p, role: 'Owner' }))}
              >
                <strong>Pemilik Kos (Owner)</strong>
                <span>Kelola kos & kamar (verifikasi Admin)</span>
              </button>
            </div>
            {errors.role && <div className="field-error">{errors.role}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="reg-nama">Nama Lengkap</label>
            <input
              id="reg-nama"
              name="nama"
              type="text"
              className={`form-control ${errors.nama ? 'is-invalid' : ''}`}
              placeholder="Contoh: Budi Santoso"
              value={form.nama}
              onChange={handleChange}
              required
            />
            {errors.nama && <div className="field-error">{errors.nama}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              name="email"
              type="email"
              className={`form-control ${errors.email ? 'is-invalid' : ''}`}
              placeholder="nama@email.com"
              value={form.email}
              onChange={handleChange}
              required
            />
            {errors.email && <div className="field-error">{errors.email}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="reg-password">Password (minimal 8 karakter)</label>
            <input
              id="reg-password"
              name="password"
              type="password"
              className={`form-control ${errors.password ? 'is-invalid' : ''}`}
              placeholder="Minimal 8 karakter"
              value={form.password}
              onChange={handleChange}
              required
            />
            {errors.password && <div className="field-error">{errors.password}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="reg-wa">Nomor WhatsApp (Opsional)</label>
            <input
              id="reg-wa"
              name="no_wa"
              type="tel"
              className={`form-control ${errors.no_wa ? 'is-invalid' : ''}`}
              placeholder="Contoh: 081234567890"
              value={form.no_wa}
              onChange={handleChange}
            />
            {errors.no_wa && <div className="field-error">{errors.no_wa}</div>}
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Mendaftarkan...' : 'Daftar Sekarang'}
          </button>
        </form>

        <p className="auth-switch">
          Sudah punya akun? <Link to="/login">Masuk di sini</Link>
        </p>
      </div>
    </div>
  );
}
