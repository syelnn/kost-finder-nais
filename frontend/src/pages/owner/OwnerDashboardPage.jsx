import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../../api/client';
import AppLayout from '../../components/AppLayout';
import ChartCanvas from '../../components/ChartCanvas';
import { Spinner } from '../../components/Ui';
import { useToast } from '../../context/ToastContext';
import { formatRupiah } from '../../utils/format';

export default function OwnerDashboardPage() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/owner/dashboard');
      setData(res.data.data);
    } catch (err) {
      showToast(getErrorMessage(err, 'Gagal memuat dashboard Owner.'), 'error');
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
          <h1>Dashboard Pemilik Kos</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Pantau okupansi kamar, pengajuan booking menunggu persetujuan, dan grafik estimasi pendapatan bulanan.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/owner/kos/baru" className="btn btn-secondary">
            + Tambah Kos
          </Link>
          <Link to="/owner/booking" className="btn btn-primary">
            Proses Booking
          </Link>
        </div>
      </div>

      {loading || !data ? (
        <Spinner label="Memuat statistik dashboard Owner..." />
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Total Kos Saya</div>
              <div className="stat-value">{data.kartu.total_kos}</div>
              <div className="stat-sub">{data.kartu.kos_aktif} kos aktif dipublikasikan</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Kamar</div>
              <div className="stat-value">{data.kartu.total_kamar}</div>
              <div className="stat-sub">{data.kartu.kamar_terisi} kamar sedang terisi</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Tingkat Okupansi</div>
              <div className="stat-value">{String(data.kartu.okupansi_persen).replace('.', ',')}%</div>
              <div className="stat-sub">
                Potensi: {formatRupiah(data.kartu.potensi_pendapatan)}/bln
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Booking Menunggu</div>
              <div className="stat-value" style={{ color: 'var(--warning)' }}>
                {data.kartu.booking_menunggu}
              </div>
              <div className="stat-sub">Perlu segera disetujui / ditolak</div>
            </div>
          </div>

          <div className="chart-grid">
            <div className="card">
              <h3>Komposisi Status Kamar (Okupansi)</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Perbandingan kamar Kosong, Dalam Booking, dan Terisi di seluruh kos Anda.
              </p>
              <ChartCanvas
                type="doughnut"
                labels={data.grafik.statusKamar.labels}
                datasets={[
                  {
                    label: 'Jumlah Kamar',
                    data: data.grafik.statusKamar.data,
                    backgroundColor: ['#16a34a', '#0284c7', '#64748b'],
                  },
                ]}
              />
            </div>

            <div className="card">
              <h3>Persentase Okupansi per Kos (%)</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Rasio kamar Terisi dibagi total kamar pada masing-masing kos.
              </p>
              <ChartCanvas
                type="bar"
                labels={data.grafik.okupansiPerKos.labels}
                datasets={[
                  {
                    label: 'Okupansi (%)',
                    data: data.grafik.okupansiPerKos.data,
                    backgroundColor: '#0d9488',
                    borderRadius: 6,
                  },
                ]}
                options={{
                  scales: {
                    y: { beginAtZero: true, max: 100 },
                  },
                }}
              />
            </div>
          </div>

          <div className="card">
            <h3>Estimasi Pendapatan per Bulan (6 Bulan Terakhir)</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Total harga kamar dari booking berstatus Disetujui dan Selesai per bulan pembuatan.
            </p>
            <ChartCanvas
              type="bar"
              labels={data.grafik.pendapatanPerBulan.labels}
              datasets={[
                {
                  label: 'Estimasi Pendapatan (Rp)',
                  data: data.grafik.pendapatanPerBulan.data,
                  backgroundColor: '#0f766e',
                  borderRadius: 6,
                },
              ]}
              height={280}
            />
          </div>
        </>
      )}
    </AppLayout>
  );
}
