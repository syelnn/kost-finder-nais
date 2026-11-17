import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../../api/client';
import AppLayout from '../../components/AppLayout';
import ChartCanvas from '../../components/ChartCanvas';
import { Spinner } from '../../components/Ui';
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
            <div className="stat-card">
              <div className="stat-label">Total Kos Terdaftar</div>
              <div className="stat-value">{data.kartu.total_kos}</div>
              <div className="stat-sub">{data.kartu.kos_aktif} kos aktif di peta</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Owner Menunggu Verifikasi</div>
              <div className="stat-value" style={{ color: 'var(--warning)' }}>
                {data.kartu.owner_menunggu}
              </div>
              <div className="stat-sub">Dari total {data.kartu.total_owner} akun Owner</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Booking</div>
              <div className="stat-value">{data.kartu.total_booking}</div>
              <div className="stat-sub">Seluruh pengajuan survey/sewa</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Pencari Kos (User)</div>
              <div className="stat-value">{data.kartu.total_user}</div>
              <div className="stat-sub">Pengguna terdaftar aktif</div>
            </div>
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
                    backgroundColor: '#0f766e',
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
                    borderColor: '#0d9488',
                    backgroundColor: 'rgba(13, 148, 136, 0.15)',
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
