const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const env = require('./config/env');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin(origin, cb) {
      // izinkan request tanpa origin (curl, smoke test, proxy Vite) dan origin yang terdaftar
      if (!origin || env.CLIENT_ORIGIN.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    exposedHeaders: ['Content-Disposition'],
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// Foto kos (path relatif dari database, mis. /uploads/kos/abc.jpg)
app.use('/uploads', express.static(env.UPLOAD_DIR, { fallthrough: true, maxAge: '1d', index: false }));
app.use('/uploads', (req, res) => res.status(404).json({ success: false, message: 'Foto tidak ditemukan.' }));

app.get('/api/health', (req, res) => res.json({ success: true, message: 'Kos Finder API berjalan.' }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api', require('./routes/adminRoutes'));
app.use('/api', require('./routes/ownerRoutes'));
app.use('/api', require('./routes/userRoutes'));
app.use('/api', require('./routes/reportRoutes'));

app.use('/api', notFound);
app.use(errorHandler);

module.exports = app;
