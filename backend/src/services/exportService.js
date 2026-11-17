const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { rupiah, tanggalId, tanggalWaktuId } = require('../utils/format');

/** Format nilai untuk tampilan teks (PDF). */
function displayValue(col, value) {
  if (value === null || value === undefined || value === '') return '-';
  switch (col.type) {
    case 'rupiah':
      return rupiah(value);
    case 'date':
      return tanggalId(value);
    case 'rating':
      return Number(value).toFixed(1).replace('.', ',');
    default:
      return String(value);
  }
}

/** Nilai mentah untuk Excel/CSV (angka tetap angka). */
function cellValue(col, value) {
  if (value === null || value === undefined) return '';
  if (col.type === 'rupiah' || col.type === 'int' || col.type === 'rating') return Number(value);
  if (col.type === 'date') return tanggalId(value);
  if (value instanceof Date) return tanggalWaktuId(value);
  return value;
}

/**
 * PDF tabel rapi: judul, tanggal cetak, filter aktif, header tabel berulang, nomor halaman.
 * @returns {Promise<Buffer>}
 */
function buildPdf({ title, subtitle, filterText, columns, rows }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36, bufferPages: true, info: { Title: title, Author: 'Kos Finder' } });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = doc.page.margins.left;
    const usable = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const bottom = doc.page.height - doc.page.margins.bottom - 20;
    const pad = 4;
    const fontSize = 8.5;

    // Lebar kolom proporsional terhadap panjang isi
    const texts = rows.map((r) => columns.map((c) => displayValue(c, r[c.key])));
    const weights = columns.map((c, i) => {
      const maxLen = Math.max(c.header.length, ...texts.map((t) => t[i].length).slice(0, 500));
      return Math.min(Math.max(maxLen, 4), c.key === 'alamat' ? 45 : 28);
    });
    const totalW = weights.reduce((a, b) => a + b, 0) + 3; // +kolom No
    const noW = (3 / totalW) * usable;
    const widths = weights.map((w) => (w / totalW) * usable);

    // Header dokumen
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#0f766e').text('KOS FINDER', left, 36);
    doc.font('Helvetica').fontSize(9).fillColor('#475569').text('Aplikasi Pencarian dan Pemesanan Kos Berbasis Peta');
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#0f172a').text(title, left, doc.y + 8);
    doc.font('Helvetica').fontSize(9).fillColor('#334155');
    if (subtitle) doc.text(subtitle);
    doc.text(`Tanggal cetak: ${tanggalWaktuId(new Date())}`);
    doc.text(`Filter aktif: ${filterText}`);
    doc.text(`Jumlah data: ${rows.length}`);
    let y = doc.y + 8;

    const drawHeader = () => {
      doc.font('Helvetica-Bold').fontSize(fontSize);
      const cells = ['No', ...columns.map((c) => c.header)];
      const ws = [noW, ...widths];
      const h = Math.max(...cells.map((c, i) => doc.heightOfString(c, { width: ws[i] - pad * 2 }))) + pad * 2;
      let x = left;
      cells.forEach((c, i) => {
        doc.rect(x, y, ws[i], h).fillAndStroke('#0f766e', '#0f766e');
        doc.fillColor('#ffffff').text(c, x + pad, y + pad, { width: ws[i] - pad * 2 });
        x += ws[i];
      });
      y += h;
    };

    drawHeader();
    if (!rows.length) {
      doc.font('Helvetica-Oblique').fontSize(10).fillColor('#475569').text('Tidak ada data sesuai filter.', left, y + 10, { width: usable, align: 'center' });
    }
    texts.forEach((t, idx) => {
      doc.font('Helvetica').fontSize(fontSize);
      const cells = [String(idx + 1), ...t];
      const ws = [noW, ...widths];
      const h = Math.max(...cells.map((c, i) => doc.heightOfString(c, { width: ws[i] - pad * 2 }))) + pad * 2;
      if (y + h > bottom) {
        doc.addPage();
        y = doc.page.margins.top;
        drawHeader();
        doc.font('Helvetica').fontSize(fontSize);
      }
      let x = left;
      cells.forEach((c, i) => {
        if (idx % 2 === 1) doc.rect(x, y, ws[i], h).fill('#f0fdfa');
        doc.rect(x, y, ws[i], h).lineWidth(0.5).strokeColor('#cbd5e1').stroke();
        doc.fillColor('#0f172a').text(c, x + pad, y + pad, { width: ws[i] - pad * 2 });
        x += ws[i];
      });
      y += h;
    });

    // Nomor halaman
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(
        `Halaman ${i + 1} dari ${range.count}`,
        left,
        doc.page.height - doc.page.margins.bottom - 10,
        { width: usable, align: 'right', lineBreak: false }
      );
      doc.text(`${title} - Kos Finder`, left, doc.page.height - doc.page.margins.bottom - 10, { width: usable, align: 'left', lineBreak: false });
    }
    doc.end();
  });
}

function fillSheet(ws, columns, rows) {
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key }));
  rows.forEach((r) => {
    const obj = {};
    columns.forEach((c) => {
      obj[c.key] = cellValue(c, r[c.key]);
    });
    ws.addRow(obj);
  });
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
  header.alignment = { vertical: 'middle' };
  columns.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    if (c.type === 'rupiah') col.numFmt = '"Rp" #,##0';
    let max = c.header.length;
    col.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
      if (rowNumber === 1) return;
      const len = c.type === 'rupiah' ? String(cell.value).length + 6 : String(cell.value ?? '').length;
      if (len > max) max = len;
    });
    col.width = Math.min(Math.max(max + 2, 8), 60);
  });
  ws.views = [{ state: 'frozen', ySplit: 1 }];
}

/**
 * @param {Array<{name: string, columns: Array, rows: Array}>} sheets
 * @returns {Promise<Buffer>}
 */
async function buildXlsx(sheets) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Kos Finder';
  wb.created = new Date();
  sheets.forEach((s) => fillSheet(wb.addWorksheet(s.name.slice(0, 31)), s.columns, s.rows));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** CSV UTF-8 dengan BOM agar terbuka benar di Excel. */
async function buildCsv(columns, rows) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('data');
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key }));
  rows.forEach((r) => {
    const obj = {};
    columns.forEach((c) => {
      const v = r[c.key];
      if (v === null || v === undefined) obj[c.key] = '';
      else if (v instanceof Date) obj[c.key] = v.toISOString();
      else if (Array.isArray(v)) obj[c.key] = v.join('; ');
      else obj[c.key] = v;
    });
    ws.addRow(obj);
  });
  const buf = Buffer.from(await wb.csv.writeBuffer({ formatterOptions: { delimiter: ',', quote: '"' } }));
  return Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), buf]);
}

module.exports = { buildPdf, buildXlsx, buildCsv, displayValue };
