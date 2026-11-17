const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const env = require('../config/env');
const { AppError } = require('../utils/http');

const KOS_DIR = path.join(env.UPLOAD_DIR, 'kos');
fs.mkdirSync(KOS_DIR, { recursive: true });

const ALLOWED = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, KOS_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ALLOWED[file.mimetype]}`),
});

const uploadFotoKos = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED[file.mimetype]) {
      return cb(new AppError(422, 'Format foto harus JPG, PNG, atau WEBP.', { foto: 'Format foto harus JPG, PNG, atau WEBP.' }));
    }
    return cb(null, true);
  },
}).array('foto', 5);

/** Cek magic number berkas agar MIME tidak dipalsukan. */
function isRealImage(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(12);
  fs.readSync(fd, buf, 0, 12, 0);
  fs.closeSync(fd);
  const jpg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const png = buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp = buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP';
  return jpg || png || webp;
}

function removeFiles(files = []) {
  for (const f of files) {
    fs.promises.unlink(f.path || f).catch(() => {});
  }
}

/** Hapus file foto berdasarkan path relatif (mis. 'kos/abc.jpg'), aman dari path traversal. */
function removeRelative(relPath) {
  const full = path.resolve(env.UPLOAD_DIR, relPath);
  if (!full.startsWith(path.resolve(env.UPLOAD_DIR))) return;
  fs.promises.unlink(full).catch(() => {});
}

module.exports = { uploadFotoKos, isRealImage, removeFiles, removeRelative };
