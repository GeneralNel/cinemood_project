function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'sign in first' });
  res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
}

module.exports = requireAuth;
