const { z } = require('zod');
const { AppError } = require('./http');

/** Ubah ZodError menjadi { field: pesan } */
function zodErrors(error) {
  const errors = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_';
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

/**
 * Middleware validasi zod.
 * @param {{body?: z.ZodTypeAny, query?: z.ZodTypeAny, params?: z.ZodTypeAny}} schemas
 */
function validate(schemas) {
  return (req, res, next) => {
    for (const key of ['params', 'query', 'body']) {
      if (!schemas[key]) continue;
      const result = schemas[key].safeParse(req[key] ?? {});
      if (!result.success) {
        return next(new AppError(422, 'Data yang dikirim tidak valid.', zodErrors(result.error)));
      }
      if (key === 'query') {
        req.validQuery = result.data;
      } else {
        req[key] = result.data;
      }
    }
    return next();
  };
}

// ---------- skema umum ----------
const idParam = z.object({
  id: z.coerce
    .number({ invalid_type_error: 'ID harus berupa angka.' })
    .int('ID harus bilangan bulat.')
    .positive('ID tidak valid.'),
});

const req = (label) => ({
  required_error: `${label} wajib diisi.`,
  invalid_type_error: `${label} tidak valid.`,
});

const optionalText = (max, label) =>
  z
    .string(req(label))
    .trim()
    .max(max, `${label} maksimal ${max} karakter.`)
    .optional()
    .transform((v) => (v === undefined || v === '' ? null : v));

module.exports = { validate, zodErrors, idParam, req, optionalText, z };
