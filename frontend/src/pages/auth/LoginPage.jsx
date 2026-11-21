import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { useAuth, roleHomePath } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage, getFieldErrors } from '../../api/client';
import { safeFrom } from '../../components/ProtectedRoute';
import AuthLayout from '../../components/AuthLayout';
import '../../styles/auth/auth.css';

const DUMMY_ACCOUNTS = [
  { label: 'Owner (Terverifikasi)', email: 'owner1@kosfinder.id' },
  { label: 'Owner (Menunggu)', email: 'owner3@kosfinder.id' },
  { label: 'Pencari Kos (User)', email: 'user1@kosfinder.id' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);
    try {
      const res = await login(email, password);
      showToast(res.message || 'Login berhasil.', 'success');
      navigate(safeFrom(location) || roleHomePath(res.data.user.role), { replace: true });
    } catch (err) {
      setErrors(getFieldErrors(err));
      showToast(getErrorMessage(err, 'Email atau password salah.'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDummy = (accEmail) => {
    setEmail(accEmail);
    setPassword('Password123!');
    setErrors({});
  };

  return (
    <AuthLayout
      title="Masuk ke Akun Anda"
      subtitle="Gunakan email dan password terdaftar untuk mengakses fitur sesuai peran."
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="login-email">Email</label>
          <div className={`auth-input-wrap ${errors.email ? 'is-invalid' : ''}`}>
            <Mail size={18} className="auth-input-icon" aria-hidden="true" />
            <input
              id="login-email"
              type="email"
              className="auth-input"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          {errors.email && <div className="field-error">{errors.email}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="login-password">Password</label>
          <div className={`auth-input-wrap ${errors.password ? 'is-invalid' : ''}`}>
            <Lock size={18} className="auth-input-icon" aria-hidden="true" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className="auth-input auth-input-with-toggle"
              placeholder="Masukkan password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
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

        <button type="submit" className="btn btn-primary btn-block auth-submit-btn" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 size={18} className="auth-spin" aria-hidden="true" />
              <span>Memverifikasi...</span>
            </>
          ) : (
            'Masuk'
          )}
        </button>
      </form>

      <div className="dummy-box">
        <div className="dummy-title">Isi Cepat Akun Dummy (Password: Password123!)</div>
        <div className="dummy-buttons">
          {DUMMY_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => fillDummy(a.email)}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <p className="auth-switch">
        Belum punya akun?{' '}
        <Link to="/register" state={location.state}>
          Daftar sekarang
        </Link>
      </p>
    </AuthLayout>
  );
}
