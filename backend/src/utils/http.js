class AppError extends Error {
  /**
   * @param {number} status kode HTTP
   * @param {string} message pesan berbahasa Indonesia
   * @param {object} [errors] pesan per-field
   */
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function ok(res, data, message, status = 200) {
  const body = { success: true };
  if (message) body.message = message;
  if (data !== undefined) body.data = data;
  return res.status(status).json(body);
}

function created(res, data, message) {
  return ok(res, data, message, 201);
}

module.exports = { AppError, asyncHandler, ok, created };
