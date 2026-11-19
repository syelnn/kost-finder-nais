import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../../api/client';
import AppLayout from '../../components/AppLayout';
import ChartCanvas from '../../components/ChartCanvas';
import { Spinner } from '../../components/Ui';
import { useToast } from '../../context/ToastContext';
import { formatRupiah } from '../../utils/format';
import { Building2, DoorOpen, Percent, Clock, Plus, CalendarCheck } from 'lucide-react';

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
      <div className="page-header owner-dashboard-header">
        <div>
          <h1>Dashboard Pemilik Kos</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Pantau okupansi kamar, pengajuan booking menunggu persetujuan, dan grafik estimasi pendapatan bulanan.
          </p>
        </div>
        <div className="page-actions">
          <Link to="/owner/booking" className="btn btn-primary">
            <CalendarCheck className="icon" />
            Proses Booking
          </Link>
        </div>
      </div>

      {loading || !data ? (
        <Spinner label="Memuat statistik dashboard Owner..." />
      ) : (
        <>
          <div className="stat-grid">
            {[
              { label: 'Total Kos Saya', icon: Building2, value: data.kartu.total_kos, sub: `${data.kartu.kos_aktif} kos aktif dipublikasikan` },
              { label: 'Total Kamar', icon: DoorOpen, value: data.kartu.total_kamar, sub: `${data.kartu.kamar_terisi} kamar sedang terisi` },
              {
                label: 'Tingkat Okupansi',
                icon: Percent,
                value: `${String(data.kartu.okupansi_persen).replace('.', ',')}%`,
                sub: `Potensi: ${formatRupiah(data.kartu.potensi_pendapatan)}/bln`,
              },
              { label: 'Booking Menunggu', icon: Clock, value: data.kartu.booking_menunggu, sub: 'Perlu segera disetujui / ditolak', warn: true },
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
                    backgroundColor: '#16a34a',
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
                  backgroundColor: '#15803d',
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