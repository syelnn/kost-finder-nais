const multer = require('multer');
const { AppError } = require('../utils/http');

/** 404 untuk route API yang tidak dikenal */
function notFound(req, res, next) {
  next(new AppError(404, `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan.`));
}

/** Penanganan error terpusat (tanpa membocorkan stack trace). */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || 'Terjadi kesalahan pada server.';
  let { errors } = err;

  if (err instanceof multer.MulterError) {
    status = 422;
    const map = {
      LIMIT_FILE_SIZE: 'Ukuran foto maksimal 2 MB.',
      LIMIT_FILE_COUNT: 'Maksimal 5 foto per kos.',
      LIMIT_UNEXPECTED_FILE: 'Field file tidak dikenal atau jumlah foto melebihi batas (maks. 5).',
    };
    message = map[err.code] || 'Upload foto gagal.';
    errors = { foto: message };
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Ukuran data terlalu besar (maks. 1 MB).';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Format JSON tidak valid.';
  } else if (err.code === '23505') {
    status = 409;
    message = 'Data sudah ada (duplikat).';
  } else if (err.code === '23503') {
    status = 409;
    message = 'Data masih terkait dengan data lain.';
  } else if (err.code === '22P02' || err.code === '23514') {
    status = 422;
    message = 'Nilai data tidak valid.';
  }

  if (status >= 500) {
    console.error('[ERROR]', err);
    message = 'Terjadi kesalahan pada server. Silakan coba lagi.';
    errors = undefined;
  }

  const body = { success: false, message };
  if (errors) body.errors = errors;
  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
