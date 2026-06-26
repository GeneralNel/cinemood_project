const crypto = require('crypto');

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

function csrf() {
  return function (req, res, next) {
    if (!req.session) return next(new Error('csrf requires session'));

    if (!req.session.csrf) {
      req.session.csrf = crypto.randomBytes(24).toString('hex');
    }

    req.csrfToken = () => req.session.csrf;

    if (SAFE.has(req.method)) return next();

    const sent = req.get('x-csrf-token') || (req.body && req.body._csrf);
    if (sent && sent === req.session.csrf) return next();

    const err = new Error('bad csrf token');
    err.code = 'EBADCSRFTOKEN';
    next(err);
  };
}

module.exports = csrf;
