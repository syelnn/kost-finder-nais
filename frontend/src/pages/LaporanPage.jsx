import React, { useCallback, useEffect, useState } from 'react';
import api, { downloadFile, getErrorMessage } from '../api/client';
import AppLayout from '../components/AppLayout';
import ChartCanvas from '../components/ChartCanvas';
import { EmptyState, Pagination, Spinner, StatusBadge } from '../components/Ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Download } from 'lucide-react';
import { formatRating, formatRupiah, formatTanggal } from '../utils/format';

const BACKUP_TABLES = [
  'user',
  'kos',
  'foto_kos',
  'fasilitas',
  'kos_fasilitas',
  'kamar',
  'booking',
  'review',
];

export default function LaporanPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [wilayah, setWilayah] = useState('');
  const [tipeKos, setTipeKos] = useState('');
  const [statusBooking, setStatusBooking] = useState('');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('kos');
  const [pageKos, setPageKos] = useState(1);
  const [pageKamar, setPageKamar] = useState(1);
  const [pageBooking, setPageBooking] = useState(1);
  const [busyKey, setBusyKey] = useState('');

  const buildFilterQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (wilayah) params.set('wilayah', wilayah);
    if (tipeKos) params.set('tipeKos', tipeKos);
    if (statusBooking) params.set('statusBooking', statusBooking);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }, [wilayah, tipeKos, statusBooking]);

  const loadLaporan = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (wilayah) params.wilayah = wilayah;
      if (tipeKos) params.tipeKos = tipeKos;
      if (statusBooking) params.statusBooking = statusBooking;
      const res = await api.get('/laporan', { params });
      setData(res.data.data);
      setPageKos(1);
      setPageKamar(1);
      setPageBooking(1);
    } catch (err) {
      showToast(getErrorMessage(err, 'Gagal memuat data laporan.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [wilayah, tipeKos, statusBooking, showToast]);

  useEffect(() => {
    loadLaporan();
  }, [loadLaporan]);

  const handleExport = async (jenis, format) => {
    const key = `${jenis}.${format}`;
    setBusyKey(key);
    try {
      await downloadFile(`/export/${jenis}.${format}${buildFilterQuery()}`, `laporan-${jenis}.${format}`);
      showToast(`Ekspor ${jenis.toUpperCase()} (${format.toUpperCase()}) berhasil diunduh.`, 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Gagal mengekspor laporan.'), 'error');
    } finally {
      setBusyKey('');
    }
  };

  const handleBackupXlsx = async () => {
    setBusyKey('backup-xlsx');
    try {
      await downloadFile('/backup/xlsx', 'backup-kos-finder.xlsx');
      showToast('Backup multi-sheet (.xlsx) berhasil diunduh.', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Gagal mengunduh backup Excel.'), 'error');
    } finally {
      setBusyKey('');
    }
  };

  const handleBackupCsv = async (tabel) => {
    const key = `csv-${tabel}`;
    setBusyKey(key);
    try {
      await downloadFile(`/backup/csv/${tabel}`, `backup-${tabel}.csv`);
      showToast(`Backup CSV tabel "${tabel}" berhasil diunduh.`, 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Gagal mengunduh backup CSV.'), 'error');
    } finally {
      setBusyKey('');
    }
  };

  const resetFilters = () => {
    setWilayah('');
    setTipeKos('');
    setStatusBooking('');
  };

  // Tombol Reset Filter hanya tampil bila ada filter yang sudah dipilih.
  const hasActiveFilter = Boolean(wilayah || tipeKos || statusBooking);

  const pageSize = 10;
  const kosRows = data?.kos || [];
  const kamarRows = data?.kamar || [];
  const bookingRows = data?.booking || [];

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>Laporan, Ekspor & Backup Data ({user?.role})</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Filter laporan memengaruhi grafik, tabel rincian, serta dokumen hasil ekspor PDF dan Excel (.xlsx).
          </p>
        </div>
      </div>

      {/* Filter Laporan */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, minHeight: 34 }}>
          <h3 style={{ margin: 0 }}>Filter Laporan</h3>
          {hasActiveFilter && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={resetFilters}>
              Reset Filter
            </button>
          )}
        </div>
        <div className="form-row filter-grid">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="lap-wilayah">Wilayah (Kota/Kabupaten)</label>
            <select
              id="lap-wilayah"
              className="form-control"
              value={wilayah}
              onChange={(e) => setWilayah(e.target.value)}
            >
              <option value="">Semua Wilayah</option>
              {(data?.filterOptions?.wilayah || []).map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="lap-tipe">Tipe Kos</label>
            <select
              id="lap-tipe"
              className="form-control"
              value={tipeKos}
              onChange={(e) => setTipeKos(e.target.value)}
            >
              <option value="">Semua Tipe Kos</option>
              <option value="Putra">Putra</option>
              <option value="Putri">Putri</option>
              <option value="Campur">Campur</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="lap-status-booking">Status Booking</label>
            <select
              id="lap-status-booking"
              className="form-control"
              value={statusBooking}
              onChange={(e) => setStatusBooking(e.target.value)}
            >
              <option value="">Semua Status Booking</option>
              <option value="Menunggu">Menunggu</option>
              <option value="Disetujui">Disetujui</option>
              <option value="Ditolak">Ditolak</option>
              <option value="Selesai">Selesai</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ekspor & Backup */}
      <div className="chart-grid" style={{ marginBottom: 20 }}>
        <div className="card">
          <h3>Ekspor Laporan (Mengikuti Filter Aktif)</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Unduh laporan Kos, Kamar, atau Booking ke format PDF siap cetak atau lembar kerja Excel (.xlsx).
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { jenis: 'kos', label: 'Data Kos' },
              { jenis: 'kamar', label: 'Data Kamar' },
              { jenis: 'booking', label: 'Data Booking' },
            ].map((item) => (
              <div
                key={item.jenis}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 8,
                  padding: '8px 12px',
                  background: '#f8fafc',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                }}
              >
                <strong>{item.label}</strong>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={busyKey === `${item.jenis}.pdf`}
                    onClick={() => handleExport(item.jenis, 'pdf')}
                  >
                    {busyKey === `${item.jenis}.pdf` ? 'Mengunduh...' : 'Ekspor PDF'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={busyKey === `${item.jenis}.xlsx`}
                    onClick={() => handleExport(item.jenis, 'xlsx')}
                  >
                    {busyKey === `${item.jenis}.xlsx` ? 'Mengunduh...' : 'Ekspor Excel (.xlsx)'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Backup Data (Tanpa Kolom Password)</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Unduh cadangan seluruh tabel yang berhak Anda akses dalam satu berkas Excel multi-sheet atau CSV per tabel (UTF-8 BOM).
          </p>
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={busyKey === 'backup-xlsx'}
            onClick={handleBackupXlsx}
            style={{ marginBottom: 12 }}
          >
            {busyKey === 'backup-xlsx' ? (
              'Menyiapkan Backup Excel...'
            ) : (
              <>
                <Download size={18} aria-hidden="true" />
                Unduh Backup Lengkap Multi-Sheet (.xlsx)
              </>
            )}
          </button>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
            Unduh CSV per Tabel:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {BACKUP_TABLES.map((t) => (
              <button
                key={t}
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={busyKey === `csv-${t}`}
                onClick={() => handleBackupCsv(t)}
              >
                {busyKey === `csv-${t}` ? '...' : `${t}.csv`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading || !data ? (
        <Spinner label="Memuat data laporan & grafik..." />
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Kos (Terfilter)</div>
              <div className="stat-value">{data.ringkasan.total_kos}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Kamar (Terfilter)</div>
              <div className="stat-value">{data.ringkasan.total_kamar}</div>
              <div className="stat-sub">Okupansi {data.ringkasan.okupansi_persen}%</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Booking (Terfilter)</div>
              <div className="stat-value">{data.ringkasan.total_booking}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Nilai Booking</div>
              <div className="stat-value" style={{ fontSize: 20 }}>
                {formatRupiah(data.ringkasan.estimasi_pendapatan)}
              </div>
              <div className="stat-sub">Booking Disetujui & Selesai</div>
            </div>
          </div>

          <div className="chart-grid">
            <div className="card">
              <h3>Distribusi Status Booking (Terfilter)</h3>
              <ChartCanvas
                type="bar"
                labels={data.grafik.statusBooking.labels}
                datasets={[
                  {
                    label: 'Jumlah Booking',
                    data: data.grafik.statusBooking.data,
                    backgroundColor: ['#d97706', '#16a34a', '#dc2626', '#0f766e'],
                    borderRadius: 6,
                  },
                ]}
              />
            </div>

            <div className="card">
              <h3>Tren Booking per Bulan (Terfilter)</h3>
              <ChartCanvas
                type="line"
                labels={data.grafik.bookingPerBulan.labels}
                datasets={[
                  {
                    label: 'Jumlah Booking',
                    data: data.grafik.bookingPerBulan.data,
                    borderColor: '#0f766e',
                    backgroundColor: 'rgba(15, 118, 110, 0.15)',
                    fill: true,
                    tension: 0.3,
                  },
                ]}
              />
            </div>
          </div>

          {/* Tabel Laporan */}
          <div className="card">
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'kos' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('kos')}
              >
                Tabel Kos ({kosRows.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'kamar' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('kamar')}
              >
                Tabel Kamar ({kamarRows.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'booking' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('booking')}
              >
                Tabel Booking ({bookingRows.length})
              </button>
            </div>

            {activeTab === 'kos' && (
              <>
                {kosRows.length === 0 ? (
                  <EmptyState title="Tidak ada data kos sesuai filter" />
                ) : (
                  <>
                    <div className="table-responsive">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Nama Kos</th>
                            <th>Pemilik</th>
                            <th>Wilayah</th>
                            <th>Tipe</th>
                            <th>Status</th>
                            <th>Kamar (Kosong/Total)</th>
                            <th>Harga Mulai</th>
                            <th>Rating</th>
                          </tr>
                        </thead>
                        <tbody>
                          {kosRows
                            .slice((pageKos - 1) * pageSize, pageKos * pageSize)
                            .map((k) => (
                              <tr key={k.kos_id}>
                                <td>#{k.kos_id}</td>
                                <td>
                                  <strong>{k.nama_kos}</strong>
                                </td>
                                <td>{k.pemilik}</td>
                                <td>{k.wilayah}</td>
                                <td>
                                  <StatusBadge status={k.tipe_kos} />
                                </td>
                                <td>
                                  <StatusBadge status={k.status_verifikasi} />
                                </td>
                                <td>
                                  {k.kamar_kosong} / {k.jumlah_kamar}
                                </td>
                                <td>{formatRupiah(k.harga_mulai)}</td>
                                <td>★ {formatRating(k.rata_rating)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                    <Pagination
                      page={pageKos}
                      totalItems={kosRows.length}
                      pageSize={pageSize}
                      onPageChange={setPageKos}
                    />
                  </>
                )}
              </>
            )}

            {activeTab === 'kamar' && (
              <>
                {kamarRows.length === 0 ? (
                  <EmptyState title="Tidak ada data kamar sesuai filter" />
                ) : (
                  <>
                    <div className="table-responsive">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Nama Kos</th>
                            <th>Wilayah</th>
                            <th>No. Kamar</th>
                            <th>Tipe Kamar</th>
                            <th>Harga / Bulan</th>
                            <th>Status Kamar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {kamarRows
                            .slice((pageKamar - 1) * pageSize, pageKamar * pageSize)
                            .map((km) => (
                              <tr key={km.kamar_id}>
                                <td>#{km.kamar_id}</td>
                                <td>
                                  <strong>{km.nama_kos}</strong>
                                </td>
                                <td>{km.wilayah}</td>
                                <td>No. {km.no_kamar}</td>
                                <td>{km.tipe_kamar}</td>
                                <td>{formatRupiah(km.harga)}</td>
                                <td>
                                  <StatusBadge status={km.status_kamar} />
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                    <Pagination
                      page={pageKamar}
                      totalItems={kamarRows.length}
                      pageSize={pageSize}
                      onPageChange={setPageKamar}
                    />
                  </>
                )}
              </>
            )}

            {activeTab === 'booking' && (
              <>
                {bookingRows.length === 0 ? (
                  <EmptyState title="Tidak ada data booking sesuai filter" />
                ) : (
                  <>
                    <div className="table-responsive">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Nama Kos & Wilayah</th>
                            <th>Kamar</th>
                            <th>Pencari Kos</th>
                            <th>Tgl Survey</th>
                            <th>Harga</th>
                            <th>Status Booking</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bookingRows
                            .slice((pageBooking - 1) * pageSize, pageBooking * pageSize)
                            .map((b) => (
                              <tr key={b.booking_id}>
                                <td>#{b.booking_id}</td>
                                <td>
                                  <strong>{b.nama_kos}</strong>
                                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                    {b.wilayah}
                                  </div>
                                </td>
                                <td>
                                  No. {b.no_kamar} - {b.tipe_kamar}
                                </td>
                                <td>{b.nama_user}</td>
                                <td>{formatTanggal(b.tanggal_survey)}</td>
                                <td>{formatRupiah(b.harga)}</td>
                                <td>
                                  <StatusBadge status={b.status_booking} />
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                    <Pagination
                      page={pageBooking}
                      totalItems={bookingRows.length}
                      pageSize={pageSize}
                      onPageChange={setPageBooking}
                    />
                  </>
                )}
              </>
            )}
          </div>
        </>
      )}
    </AppLayout>
  );
}