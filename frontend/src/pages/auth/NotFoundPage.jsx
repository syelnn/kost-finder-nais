import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth, roleHomePath } from '../../context/AuthContext';
import '../../styles/auth/auth.css';

export default function NotFoundPage() {
  const { user } = useAuth();
  const target = user ? roleHomePath(user.role) : '/';

  return (
    <div className="auth-page">
      <div className="card auth-card" style={{ textAlign: 'center' }}>
        <div className="brand-mark" style={{ margin: '0 auto 12px' }}>
          404
        </div>
        <h1>Halaman Tidak Ditemukan</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
          Maaf, alamat halaman yang Anda tuju tidak tersedia atau telah dipindahkan.
        </p>
        <Link to={target} className="btn btn-primary">
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
