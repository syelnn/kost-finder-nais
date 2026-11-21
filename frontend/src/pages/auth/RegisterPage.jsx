import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Lock, Mail, Phone, User } from 'lucide-react';
import { useAuth, roleHomePath } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage, getFieldErrors } from '../../api/client';
import { safeFrom } from '../../components/ProtectedRoute';
import AuthLayout from '../../components/AuthLayout';
import '../../styles/auth/auth.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    nama: '',
    email: '',
    password: '',
    no_wa: '',
    role: 'User',
  });
  const [showPassword, setShowPassword] = useState(false);
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
      navigate(safeFrom(location) || roleHomePath(res.data.user.role), { replace: true });
    } catch (err) {
      setErrors(getFieldErrors(err));
      showToast(getErrorMessage(err, 'Registrasi gagal. Periksa kembali isian Anda.'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Buat Akun Baru"
      subtitle="Pilih peran sebagai Pencari Kos atau Pemilik Kos."
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="reg-role">Daftar Sebagai</label>
          <div id="reg-role" className="role-selector" role="radiogroup" aria-label="Pilih peran akun">
            <button
              type="button"
              role="radio"
              aria-checked={form.role === 'User'}
              className={`role-option ${form.role === 'User' ? 'active' : ''}`}
              onClick={() => setForm((p) => ({ ...p, role: 'User' }))}
            >
              <strong>Pencari Kos (User)</strong>
              <span>Langsung aktif mencari &amp; booking kos</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={form.role === 'Owner'}
              className={`role-option ${form.role === 'Owner' ? 'active' : ''}`}
              onClick={() => setForm((p) => ({ ...p, role: 'Owner' }))}
            >
              <strong>Pemilik Kos (Owner)</strong>
              <span>Kelola kos &amp; kamar (verifikasi Admin)</span>
            </button>
          </div>
          {errors.role && <div className="field-error">{errors.role}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="reg-nama">Nama Lengkap</label>
          <div className={`auth-input-wrap ${errors.nama ? 'is-invalid' : ''}`}>
            <User size={18} className="auth-input-icon" aria-hidden="true" />
            <input
              id="reg-nama"
              name="nama"
              type="text"
              className="auth-input"
              placeholder="Contoh: Budi Santoso"
              value={form.nama}
              onChange={handleChange}
              required
              autoComplete="name"
            />
          </div>
          {errors.nama && <div className="field-error">{errors.nama}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="reg-email">Email</label>
          <div className={`auth-input-wrap ${errors.email ? 'is-invalid' : ''}`}>
            <Mail size={18} className="auth-input-icon" aria-hidden="true" />
            <input
              id="reg-email"
              name="email"
              type="email"
              className="auth-input"
              placeholder="nama@email.com"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>
          {errors.email && <div className="field-error">{errors.email}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="reg-password">Password (minimal 8 karakter)</label>
          <div className={`auth-input-wrap ${errors.password ? 'is-invalid' : ''}`}>
            <Lock size={18} className="auth-input-icon" aria-hidden="true" />
            <input
              id="reg-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              className="auth-input auth-input-with-toggle"
              placeholder="Minimal 8 karakter"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              className="auth-pwd-toggle"
              aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
          {errors.password && <div className="field-error">{errors.password}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="reg-wa">Nomor WhatsApp (Opsional)</label>
          <div className={`auth-input-wrap ${errors.no_wa ? 'is-invalid' : ''}`}>
            <Phone size={18} className="auth-input-icon" aria-hidden="true" />
            <input
              id="reg-wa"
              name="no_wa"
              type="tel"
              className="auth-input"
              placeholder="Contoh: 081234567890"
              value={form.no_wa}
              onChange={handleChange}
              autoComplete="tel"
            />
          </div>
          {errors.no_wa && <div className="field-error">{errors.no_wa}</div>}
        </div>

        <button type="submit" className="btn btn-primary btn-block auth-submit-btn" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 size={18} className="auth-spin" aria-hidden="true" />
              <span>Mendaftarkan...</span>
            </>
          ) : (
            'Daftar Sekarang'
          )}
        </button>
      </form>

      <p className="auth-switch">
        Sudah punya akun?{' '}
        <Link to="/login" state={location.state}>
          Masuk di sini
        </Link>
      </p>
    </AuthLayout>
  );
}
