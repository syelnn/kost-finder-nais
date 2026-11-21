const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const env = require('../config/env');
const { query } = require('../config/db');
const { AppError } = require('../utils/http');
const { tanggalDalamKata } = require('../utils/terbilang');
const { tanggalId } = require('../utils/format');

const KOP_PATH = path.join(env.ASSET_DIR, 'kop-surat.png');

function nomorDokumen(bookingId) {
  return `KOS/BKG-01/BOOK${String(bookingId).padStart(5, '0')}`;
}

/** GET /api/booking/:id/bukti - Bukti Konfirmasi Booking Survey / Kamar (PDF). */
async function buktiBooking(req, res) {
  const { rows } = await query(
    `SELECT b.booking_id, b.user_id, b.tipe_booking, b.status_booking, b.tanggal_survey,
            km.no_kamar, km.tipe_kamar, k.nama_kos, k.owner_id,
            o.nama AS nama_pemilik, u.nama AS nama_pencari
       FROM booking b
       JOIN kos k ON k.kos_id = b.kos_id
       LEFT JOIN kamar km ON km.kamar_id = b.kamar_id
       JOIN "user" o ON o.user_id = k.owner_id
       JOIN "user" u ON u.user_id = b.user_id
      WHERE b.booking_id = $1`,
    [req.params.id]
  );
  if (!rows.length) throw new AppError(404, 'Booking tidak ditemukan.');
  const bk = rows[0];
  const isPemilik = req.user.role === 'Owner' && bk.owner_id === req.user.user_id;
  const isPencari = req.user.role === 'User' && bk.user_id === req.user.user_id;
  if (!isPemilik && !isPencari) throw new AppError(403, 'Anda tidak berhak mengunduh bukti booking ini.');
  if (!['Disetujui', 'Selesai'].includes(bk.status_booking)) {
    throw new AppError(403, 'Bukti konfirmasi hanya tersedia untuk booking berstatus Disetujui atau Selesai.');
  }

  const isSurvey = bk.tipe_booking === 'survey';
  const docTitle = isSurvey ? 'Bukti Konfirmasi Booking Survey' : 'Bukti Konfirmasi Booking Kamar';
  const dateLabel = isSurvey ? 'Tanggal Survey' : 'Tanggal Mulai Sewa';
  const dateDisplay = tanggalId(bk.tanggal_survey);
  const kamarDisplay = bk.no_kamar
    ? `No. ${bk.no_kamar} - Tipe ${bk.tipe_kamar}`
    : 'Survey Umum (Semua Kamar)';

  const nomor = nomorDokumen(bk.booking_id);
  const tgl = tanggalDalamKata(new Date());

  const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: `${docTitle} ${nomor}`, Author: 'Kos Finder' } });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="bukti-booking-${bk.tipe_booking || 'sewa'}-${String(bk.booking_id).padStart(5, '0')}.pdf"`);
  doc.pipe(res);

  const W = doc.page.width; // 595.28
  const left = 64;
  const width = W - left * 2;
  let y;

  if (fs.existsSync(KOP_PATH)) {
    doc.image(KOP_PATH, 0, 0, { width: W, height: doc.page.height });
    y = 110;
  } else {
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#76570f').text('KOS FINDER', left, 40, { width, align: 'center' });
    doc.font('Helvetica').fontSize(10).fillColor('#334155')
      .text('Aplikasi Pencarian dan Pemesanan Kos Berbasis Peta', left, 62, { width, align: 'center' });
    doc.moveTo(left, 82).lineTo(W - left, 82).lineWidth(2).strokeColor('#76570f').stroke();
    y = 100;
  }

  doc.fillColor('#000000');
  doc.font('Helvetica-Bold').fontSize(14).text(docTitle.toUpperCase(), left, y, { width, align: 'center' });
  doc.font('Helvetica').fontSize(11).text(`Nomor: ${nomor}`, left, doc.y + 4, { width, align: 'center' });

  // Paragraf pembuka (bagian tebal sesuai lampiran)
  y = doc.y + 22;
  const parts = [
    ['Pada hari ini ', false],
    [tgl.hari, true],
    [' tanggal ', false],
    [tgl.tanggal, true],
    [' bulan ', false],
    [tgl.bulan, true],
    [' tahun ', false],
    [tgl.tahun, true],
    [`, telah dilakukan konfirmasi ${isSurvey ? 'booking survey' : 'booking kamar'} antara pihak `, false],
    ['PEMILIK KOS', true],
    [' dengan ', false],
    ['PENCARI KOS', true],
    [
      ' melalui Aplikasi Pencarian dan Pemesanan Kos Berbasis Peta. Adapun rincian booking sebagai berikut:',
      false,
    ],
  ];
  doc.fontSize(11);
  parts.forEach(([text, bold], i) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica');
    const opts = { width, align: 'justify', lineGap: 4, continued: i < parts.length - 1 };
    if (i === 0) doc.text(text, left, y, opts);
    else doc.text(text, opts);
  });

  // Tabel rincian
  y = doc.y + 16;
  const cols = [
    { label: 'No.', w: 34, align: 'center' },
    { label: 'Nama Kos', w: 128, align: 'left' },
    { label: 'Kamar', w: 128, align: 'left' },
    { label: dateLabel, w: 105, align: 'center' },
    { label: 'Status', w: width - 395, align: 'center' },
  ];
  const rowData = ['1', bk.nama_kos, kamarDisplay, dateDisplay, bk.status_booking];
  const pad = 6;

  const drawRow = (cells, yy, bold, fill) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10.5);
    const h =
      Math.max(...cells.map((c, i) => doc.heightOfString(c, { width: cols[i].w - pad * 2 }))) + pad * 2;
    let x = left;
    cells.forEach((c, i) => {
      if (fill) doc.rect(x, yy, cols[i].w, h).fillAndStroke(fill, '#000000');
      else doc.rect(x, yy, cols[i].w, h).lineWidth(0.8).strokeColor('#000000').stroke();
      doc.fillColor('#000000').text(c, x + pad, yy + pad, { width: cols[i].w - pad * 2, align: cols[i].align });
      x += cols[i].w;
    });
    return yy + h;
  };
  y = drawRow(cols.map((c) => c.label), y, true, '#e6f4f1');
  y = drawRow(rowData, y, false);

  // Penutup
  doc.font('Helvetica').fontSize(11).fillColor('#000000').text(
    'Demikian bukti konfirmasi booking ini dibuat dengan sebenar-benarnya dan berlaku sebagai bukti sah persetujuan kedua belah pihak.',
    left,
    y + 18,
    { width, align: 'justify', lineGap: 4 }
  );

  // Tanda tangan dua kolom
  y = doc.y + 36;
  const colW = width / 2;
  doc.font('Helvetica-Bold').fontSize(11);
  doc.text('Pemilik Kos', left, y, { width: colW, align: 'center' });
  doc.text('Pencari Kos', left + colW, y, { width: colW, align: 'center' });
  const signY = y + 80;
  doc.moveTo(left + 30, signY).lineTo(left + colW - 30, signY).lineWidth(0.6).stroke();
  doc.moveTo(left + colW + 30, signY).lineTo(left + width - 30, signY).lineWidth(0.6).stroke();
  doc.font('Helvetica').fontSize(11);
  doc.text(`Nama: ${bk.nama_pemilik}`, left, signY + 6, { width: colW, align: 'center' });
  doc.text(`Nama: ${bk.nama_pencari}`, left + colW, signY + 6, { width: colW, align: 'center' });

  doc.end();
}

module.exports = { buktiBooking, nomorDokumen };
