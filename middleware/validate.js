const { validationResult } = require('express-validator');

function collect(req) {
  const result = validationResult(req);
  if (result.isEmpty()) return null;
  return result.array({ onlyFirstError: true }).map(e => e.msg);
}

function htmlGuard(view, dataBuilder = () => ({})) {
  return (req, res, next) => {
    const errors = collect(req);
    if (!errors) return next();
    res.status(400).render(view, { errors, form: req.body, ...dataBuilder(req) });
  };
}

function jsonGuard() {
  return (req, res, next) => {
    const errors = collect(req);
    if (!errors) return next();
    res.status(400).json({ error: 'invalid', errors });
  };
}

module.exports = { htmlGuard, jsonGuard };
