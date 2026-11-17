import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../../api/client';
import AppLayout from '../../components/AppLayout';
import ChartCanvas from '../../components/ChartCanvas';
import { Spinner } from '../../components/Ui';
import { Building2, UserCheck, CalendarCheck, Users } from 'lucide-react';
import '../../styles/admin/dashboard.css';
import { useToast } from '../../context/ToastContext';

export default function AdminDashboardPage() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/dashboard');
      setData(res.data.data);
    } catch (err) {
      showToast(getErrorMessage(err, 'Gagal memuat dashboard Admin.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>Dashboard Administrator</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Ringkasan operasional Kos Finder, sebaran kos terdaftar per wilayah, dan pertumbuhan booking 12 bulan terakhir.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/admin/owner" className="btn btn-secondary">
            Verifikasi Owner
          </Link>
          <Link to="/admin/laporan" className="btn btn-primary">
            Buka Laporan & Backup
          </Link>
        </div>
      </div>

      {loading || !data ? (
        <Spinner label="Memuat statistik dashboard Admin..." />
      ) : (
        <>
          <div className="stat-grid">
            {[
              { label: 'Total Kos Terdaftar', icon: Building2, value: data.kartu.total_kos, sub: `${data.kartu.kos_aktif} kos aktif di peta` },
              { label: 'Owner Menunggu Verifikasi', icon: UserCheck, value: data.kartu.owner_menunggu, sub: `Dari total ${data.kartu.total_owner} akun Owner`, warn: true },
              { label: 'Total Booking', icon: CalendarCheck, value: data.kartu.total_booking, sub: 'Seluruh pengajuan survey/sewa' },
              { label: 'Total Pencari Kos (User)', icon: Users, value: data.kartu.total_user, sub: 'Pengguna terdaftar aktif' },
            ].map((c) => (
              <div className="stat-card" key={c.label}>
                <div className="stat-head">
                  <span className="stat-label">{c.label}</span>
                  <c.icon className="icon" />
                </div>
                <div className="stat-value" style={c.warn ? { color: 'var(--warning)' } : undefined}>
                  {c.value}
                </div>
                <div className="stat-sub">{c.sub}</div>
              </div>
            ))}
          </div>

          <div className="chart-grid">
            <div className="card">
              <h3>Jumlah Kos Terdaftar per Wilayah</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Dikelompokkan berdasarkan segmen wilayah pada alamat kos.
              </p>
              <ChartCanvas
                type="bar"
                labels={data.grafik.kosPerWilayah.labels}
                datasets={[
                  {
                    label: 'Jumlah Kos',
                    data: data.grafik.kosPerWilayah.data,
                    backgroundColor: '#2563eb',
                    borderRadius: 6,
                  },
                ]}
              />
            </div>

            <div className="card">
              <h3>Pertumbuhan Booking (12 Bulan Terakhir)</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Jumlah pengajuan booking per bulan berdasarkan waktu pembuatan.
              </p>
              <ChartCanvas
                type="line"
                labels={data.grafik.pertumbuhanBooking.labels}
                datasets={[
                  {
                    label: 'Booking Masuk',
                    data: data.grafik.pertumbuhanBooking.data,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    fill: true,
                    tension: 0.3,
                  },
                ]}
              />
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}