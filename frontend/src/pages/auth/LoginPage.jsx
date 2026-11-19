import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, roleHomePath } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage, getFieldErrors } from '../../api/client';
import '../../styles/auth/auth.css';

const DUMMY_ACCOUNTS = [
  { label: 'Admin', email: 'admin@kosfinder.id' },
  { label: 'Owner (Terverifikasi)', email: 'owner1@kosfinder.id' },
  { label: 'Owner (Menunggu)', email: 'owner3@kosfinder.id' },
  { label: 'Pencari Kos (User)', email: 'user1@kosfinder.id' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);
    try {
      const res = await login(email, password);
      navigate(roleHomePath(res.data.user.role), { replace: true });
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
    <div className="auth-page">
      <div className="card auth-card">
        <div className="auth-header">
          <Link to="/" className="brand-logo">
            <span className="brand-mark">⌂</span>
            <span>Kos Finder</span>
          </Link>
          <h1>Masuk ke Akun Anda</h1>
          <p>Gunakan email dan password terdaftar untuk mengakses fitur sesuai peran.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              className={`form-control ${errors.email ? 'is-invalid' : ''}`}
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            {errors.email && <div className="field-error">{errors.email}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              className={`form-control ${errors.password ? 'is-invalid' : ''}`}
              placeholder="Masukkan password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            {errors.password && <div className="field-error">{errors.password}</div>}
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Memverifikasi...' : 'Masuk'}
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
          Belum punya akun? <Link to="/register">Daftar sekarang</Link>
        </p>
      </div>
    </div>
  );
}
