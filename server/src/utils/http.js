class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isDuplicateKey = (e) =>
  e && (e.code === 11000 || (Array.isArray(e.writeErrors) && e.writeErrors.some((w) => w.code === 11000)));

function paging(query, defaultLimit = 12) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

const pageMeta = ({ page, limit }, total) => ({ page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) });

module.exports = { AppError, escapeRegex, isDuplicateKey, paging, pageMeta };
