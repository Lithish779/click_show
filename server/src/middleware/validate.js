const { ZodError } = require('zod');

/** validate({ body: schema, query: schema, params: schema }) -> req.valid.{body,query,params} */
const validate = (schemas) => (req, _res, next) => {
  req.valid = req.valid || {};
  for (const key of ['params', 'query', 'body']) {
    if (schemas[key]) req.valid[key] = schemas[key].parse(req[key] ?? {});
  }
  next();
};

function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    });
  }
  if (err.name === 'CastError') return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Malformed identifier' } });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Malformed JSON body' } });
  if (err.status && err.code) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
}

const notFound = (_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });

module.exports = { validate, errorHandler, notFound };
