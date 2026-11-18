import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api, { getErrorMessage } from '../../api/client';
import AppLayout from '../../components/AppLayout';
import { EmptyState, KosImage, Spinner, StatusBadge } from '../../components/Ui';
import { useToast } from '../../context/ToastContext';
import '../../styles/user/map.css';
import {
  KAMPUS_PRESETS,
  formatJarak,
  formatRating,
  formatRupiah,
  fotoUrl,
  placeholderSvgDataUri,
} from '../../utils/format';

const BANDUNG_CENTER = [-6.9039, 107.6186];

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function UserMapPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  // Kata kunci awal dibaca dari URL (?q=...), mis. dari search bar landing page.
  const [searchParams, setSearchParams] = useSearchParams();
  const [keyword, setKeyword] = useState(() => searchParams.get('q') || '');

  const [masterFasilitas, setMasterFasilitas] = useState([]);
  const [kosList, setKosList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedKosId, setSelectedKosId] = useState(null);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(true);

  const [refPoint, setRefPoint] = useState(null); // { lat, lng, label }
  const [pickingRef, setPickingRef] = useState(false);
  const [radius, setRadius] = useState(5);
  const [hargaMin, setHargaMin] = useState('');
  const [hargaMax, setHargaMax] = useState('');
  const [selectedFasilitas, setSelectedFasilitas] = useState([]);
  const [tipeKos, setTipeKos] = useState('');

  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const markersLayerRef = useRef(null);
  const markersByIdRef = useRef({});
  const refMarkerRef = useRef(null);
  const refCircleRef = useRef(null);
  const pickingRefState = useRef(pickingRef);
  pickingRefState.current = pickingRef;

  useEffect(() => {
    api
      .get('/fasilitas')
      .then((res) => setMasterFasilitas(res.data.data || []))
      .catch(() => {});
  }, []);

  // Init Leaflet map
  useEffect(() => {
    const L = window.L;
    if (!L || !mapElRef.current || mapRef.current) return undefined;

    const map = L.map(mapElRef.current).setView(BANDUNG_CENTER, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = layerGroup;

    map.on('click', (e) => {
      if (!pickingRefState.current) return;
      const lat = Number(e.latlng.lat.toFixed(6));
      const lng = Number(e.latlng.lng.toFixed(6));
      setRefPoint({ lat, lng, label: 'Titik pilihan di peta' });
      setPickingRef(false);
    });

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 150);

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      markersByIdRef.current = {};
      refMarkerRef.current = null;
      refCircleRef.current = null;
    };
  }, []);

  // Update reference marker + radius circle
  useEffect(() => {
    const L = window.L;
    const map = mapRef.current;
    if (!L || !map) return;

    if (!refPoint) {
      if (refMarkerRef.current) {
        map.removeLayer(refMarkerRef.current);
        refMarkerRef.current = null;
      }
      if (refCircleRef.current) {
        map.removeLayer(refCircleRef.current);
        refCircleRef.current = null;
      }
      return;
    }

    const pos = [refPoint.lat, refPoint.lng];
    const blueIcon = L.divIcon({
      className: 'custom-div-marker',
      html: '<div class="marker-pin marker-blue" title="Titik acuan (geser untuk memindahkan)"></div>',
      iconSize: [30, 30],
      iconAnchor: [15, 30],
    });

    if (!refMarkerRef.current) {
      const m = L.marker(pos, { draggable: true, icon: blueIcon }).addTo(map);
      m.on('dragend', () => {
        const ll = m.getLatLng();
        setRefPoint({
          lat: Number(ll.lat.toFixed(6)),
          lng: Number(ll.lng.toFixed(6)),
          label: 'Titik acuan digeser',
        });
      });
      refMarkerRef.current = m;
    } else {
      refMarkerRef.current.setLatLng(pos);
    }

    if (!refCircleRef.current) {
      refCircleRef.current = L.circle(pos, {
        radius: Number(radius) * 1000,
        color: '#2563eb',
        fillColor: '#60a5fa',
        fillOpacity: 0.14,
        weight: 2,
      }).addTo(map);
    } else {
      refCircleRef.current.setLatLng(pos);
      refCircleRef.current.setRadius(Number(radius) * 1000);
    }
  }, [refPoint, radius]);

  // Debounced search (300ms) + AbortController
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = {};
        if (refPoint) {
          params.lat = refPoint.lat;
          params.lng = refPoint.lng;
          params.radius = radius;
        }
        if (hargaMin !== '') params.hargaMin = hargaMin;
        if (hargaMax !== '') params.hargaMax = hargaMax;
        if (selectedFasilitas.length) params.fasilitas = selectedFasilitas.join(',');
        if (tipeKos) params.tipe = tipeKos;
        if (keyword.trim()) params.q = keyword.trim();

        const { data } = await api.get('/kos', {
          params,
          signal: controller.signal,
        });
        setKosList(data.data || []);
      } catch (err) {
        const msg = getErrorMessage(err);
        if (msg) showToast(msg, 'error');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [refPoint, radius, hargaMin, hargaMax, selectedFasilitas, tipeKos, keyword, showToast]);

  // Render kos markers on map
  useEffect(() => {
    const L = window.L;
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!L || !map || !layer) return;

    layer.clearLayers();
    markersByIdRef.current = {};

    kosList.forEach((k) => {
      const hasEmpty = Number(k.kamar_kosong) > 0;
      const icon = L.divIcon({
        className: 'custom-div-marker',
        html: `<div class="marker-pin ${hasEmpty ? 'marker-green' : 'marker-gray'}"></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -26],
      });

      const imgSrc = k.foto ? fotoUrl(k.foto) : placeholderSvgDataUri(k.nama_kos);
      const fallbackImg = placeholderSvgDataUri(k.nama_kos);
      const jarakText =
        k.jarak_km !== null && k.jarak_km !== undefined
          ? `${formatJarak(k.jarak_km)} dari titik acuan`
          : 'Atur titik acuan untuk melihat jarak';
      const hargaText =
        k.harga_mulai !== null && k.harga_mulai !== undefined
          ? `Mulai ${formatRupiah(k.harga_mulai)}/bulan`
          : 'Harga belum ditentukan';

      const popupNode = document.createElement('div');
      popupNode.style.width = '235px';
      popupNode.innerHTML = `
        <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(k.nama_kos)}"
             onerror="this.onerror=null;this.src='${fallbackImg}'"
             style="width:100%;height:125px;object-fit:cover;border-radius:8px;margin-bottom:8px;" />
        <div style="font-weight:700;font-size:14px;margin-bottom:2px;">${escapeHtml(k.nama_kos)}</div>
        <div style="font-size:12px;color:#0f766e;font-weight:700;margin-bottom:4px;">${escapeHtml(hargaText)}</div>
        <div style="font-size:12px;color:#475569;margin-bottom:4px;">📍 ${escapeHtml(jarakText)}</div>
        <div style="font-size:12px;margin-bottom:8px;">
          ⭐ ${escapeHtml(formatRating(k.rata_rating))} (${Number(k.jumlah_review || 0)}) ·
          <strong>${Number(k.kamar_kosong)} kamar kosong</strong>
        </div>
        <button type="button" class="btn btn-primary btn-sm btn-block popup-detail-btn">Lihat Detail</button>
      `;
      const btn = popupNode.querySelector('.popup-detail-btn');
      if (btn) {
        btn.addEventListener('click', () => navigate(`/kos/${k.kos_id}`));
      }

      const marker = L.marker([Number(k.latitude), Number(k.longitude)], { icon });
      marker.bindPopup(popupNode, { maxWidth: 260 });
      marker.on('click', () => setSelectedKosId(k.kos_id));
      marker.addTo(layer);
      markersByIdRef.current[k.kos_id] = marker;
    });
  }, [kosList, navigate]);

  const handleCardClick = (kos) => {
    setSelectedKosId(kos.kos_id);
    const map = mapRef.current;
    const marker = markersByIdRef.current[kos.kos_id];
    if (map && marker) {
      map.flyTo([Number(kos.latitude), Number(kos.longitude)], 16, { duration: 0.7 });
      marker.openPopup();
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      showToast('Browser Anda tidak mendukung Geolocation API.', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setRefPoint({ lat, lng, label: 'Lokasi saya (GPS)' });
        if (mapRef.current) mapRef.current.flyTo([lat, lng], 14);
        showToast('Titik acuan diatur ke lokasi Anda.', 'success');
      },
      (err) => {
        if (err.code === 1) {
          showToast('Izin lokasi ditolak. Gunakan klik peta atau pilihan cepat kampus.', 'error');
        } else {
          showToast('Gagal mendapatkan lokasi GPS (timeout/tidak tersedia).', 'error');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePresetKampus = (e) => {
    const val = e.target.value;
    if (!val) return;
    const found = KAMPUS_PRESETS.find((k) => k.nama === val);
    if (found) {
      setRefPoint({ lat: found.lat, lng: found.lng, label: found.nama });
      if (mapRef.current) mapRef.current.flyTo([found.lat, found.lng], 14);
    }
  };

  const toggleFasilitasFilter = (id) => {
    setSelectedFasilitas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleKeywordChange = (e) => {
    const value = e.target.value;
    setKeyword(value);
    // Jaga URL tetap sinkron (bisa di-refresh / dibagikan) tanpa menambah riwayat browser.
    setSearchParams(value.trim() ? { q: value } : {}, { replace: true });
  };

  const handleResetFilter = () => {
    setKeyword('');
    setSearchParams({}, { replace: true });
    setRefPoint(null);
    setPickingRef(false);
    setRadius(5);
    setHargaMin('');
    setHargaMax('');
    setSelectedFasilitas([]);
    setTipeKos('');
    if (mapRef.current) mapRef.current.setView(BANDUNG_CENTER, 12);
  };

  return (
    <AppLayout fullHeight>
      <div className="map-workspace">
        <aside className="map-sidebar" aria-label="Panel Filter dan Daftar Kos">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ marginBottom: 2 }}>Cari Kos</h2>
              <div style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 700 }}>
                {kosList.length} kos ditemukan
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setFilterDrawerOpen((p) => !p)}
              >
                {filterDrawerOpen ? 'Sembunyikan Filter' : 'Tampilkan Filter'}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleResetFilter}>
                Reset Filter
              </button>
            </div>
          </div>

          <input
            id="map-q"
            type="search"
            className="form-control"
            placeholder="Cari nama kos, alamat, atau wilayah…"
            aria-label="Cari nama kos, alamat, atau wilayah"
            value={keyword}
            onChange={handleKeywordChange}
          />

          {filterDrawerOpen && (
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: 12,
                background: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>
                  1. Titik Acuan & Radius Jarak
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${pickingRef ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setPickingRef((p) => !p)}
                  >
                    {pickingRef ? 'Klik Peta Sekarang...' : 'Atur Titik Acuan (Klik Peta)'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleUseMyLocation}
                  >
                    Gunakan Lokasi Saya
                  </button>
                </div>
                <select
                  className="form-control"
                  value={refPoint?.label && KAMPUS_PRESETS.some((k) => k.nama === refPoint.label) ? refPoint.label : ''}
                  onChange={handlePresetKampus}
                  aria-label="Pilihan cepat kampus"
                >
                  <option value="">-- Pilihan Cepat Kampus --</option>
                  {KAMPUS_PRESETS.map((k) => (
                    <option key={k.nama} value={k.nama}>
                      {k.nama}
                    </option>
                  ))}
                </select>
                {refPoint && (
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>
                        Titik: <strong>{refPoint.label}</strong>
                      </span>
                      <button
                        type="button"
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--danger)',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                        onClick={() => setRefPoint(null)}
                      >
                        Hapus Titik
                      </button>
                    </div>
                    <label
                      htmlFor="slider-radius"
                      style={{ display: 'block', marginTop: 6, fontWeight: 600 }}
                    >
                      Radius: {String(radius).replace('.', ',')} km
                    </label>
                    <input
                      id="slider-radius"
                      type="range"
                      min="0.5"
                      max="20"
                      step="0.5"
                      style={{ width: '100%' }}
                      value={radius}
                      onChange={(e) => setRadius(Number(e.target.value))}
                    />
                  </div>
                )}
              </div>

              <div className="form-row" style={{ gap: 8 }}>
                <div>
                  <label htmlFor="flt-tipe" style={{ fontSize: 12, fontWeight: 700 }}>
                    Tipe Kos
                  </label>
                  <select
                    id="flt-tipe"
                    className="form-control"
                    value={tipeKos}
                    onChange={(e) => setTipeKos(e.target.value)}
                  >
                    <option value="">Semua Tipe</option>
                    <option value="Putra">Putra</option>
                    <option value="Putri">Putri</option>
                    <option value="Campur">Campur</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="flt-min" style={{ fontSize: 12, fontWeight: 700 }}>
                    Harga Min (Rp)
                  </label>
                  <input
                    id="flt-min"
                    type="number"
                    min="0"
                    step="100000"
                    className="form-control"
                    placeholder="0"
                    value={hargaMin}
                    onChange={(e) => setHargaMin(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="flt-max" style={{ fontSize: 12, fontWeight: 700 }}>
                  Harga Maksimum per Bulan (Rp)
                </label>
                <input
                  id="flt-max"
                  type="number"
                  min="0"
                  step="100000"
                  className="form-control"
                  placeholder="Contoh: 1500000"
                  value={hargaMax}
                  onChange={(e) => setHargaMax(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  Fasilitas (wajib memiliki semua yang dipilih)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {masterFasilitas.map((f) => {
                    const active = selectedFasilitas.includes(f.fasilitas_id);
                    return (
                      <button
                        key={f.fasilitas_id}
                        type="button"
                        onClick={() => toggleFasilitasFilter(f.fasilitas_id)}
                        className={`badge ${active ? 'badge-teal' : 'badge-neutral'}`}
                        style={{
                          cursor: 'pointer',
                          border: active ? '1px solid var(--primary)' : '1px solid transparent',
                          padding: '5px 10px',
                        }}
                      >
                        {active ? '✓ ' : ''}
                        {f.nama_fasilitas}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <Spinner label="Memperbarui daftar kos..." />
          ) : kosList.length === 0 ? (
            <EmptyState
              title="Tidak ada kos yang cocok"
              description="Coba perbesar radius pencarian atau kurangi filter harga/fasilitas."
              actionLabel="Reset Filter"
              onAction={handleResetFilter}
            />
          ) : (
            <div className="kos-list-cards">
              {kosList.map((k) => (
                <div
                  key={k.kos_id}
                  className={`kos-card-item ${selectedKosId === k.kos_id ? 'active' : ''}`}
                  onClick={() => handleCardClick(k)}
                >
                  <KosImage path={k.foto} alt={k.nama_kos} className="kos-card-thumb" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                      <strong style={{ fontSize: 14 }}>{k.nama_kos}</strong>
                      <StatusBadge status={k.tipe_kos} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0' }}>
                      {k.wilayah}
                      {k.jarak_km !== null && k.jarak_km !== undefined && (
                        <> · <strong>{formatJarak(k.jarak_km)}</strong></>
                      )}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
                      {k.harga_mulai !== null ? `Mulai ${formatRupiah(k.harga_mulai)}/bln` : 'Harga belum ada'}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 4,
                        fontSize: 12,
                      }}
                    >
                      <span>
                        ★ {formatRating(k.rata_rating)} ·{' '}
                        <strong style={{ color: k.kamar_kosong > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                          {k.kamar_kosong > 0 ? `${k.kamar_kosong} kosong` : 'Penuh'}
                        </strong>
                      </span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ minHeight: 28, padding: '2px 8px', fontSize: 12 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/kos/${k.kos_id}`);
                        }}
                      >
                        Detail →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

        <section className="map-stage" aria-label="Peta Kos Interaktif">
          <div ref={mapElRef} className="leaflet-container-full" />
          <div className="map-legend">
            <strong>Legenda Marker</strong>
            <div className="legend-row">
              <span className="legend-dot" style={{ background: '#16a34a' }} />
              <span>Hijau: Ada kamar kosong</span>
            </div>
            <div className="legend-row">
              <span className="legend-dot" style={{ background: '#9ca3af' }} />
              <span>Abu-abu: Kamar penuh</span>
            </div>
            <div className="legend-row">
              <span className="legend-dot" style={{ background: '#2563eb' }} />
              <span>Biru: Titik acuan & radius</span>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
