const router = require('express').Router();
const { body } = require('express-validator');
const User = require('../models/User');
const { htmlGuard, authLimiter } = require('../middleware');

router.get('/signup', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('auth/signup', { errors: null, form: {} });
});

router.post('/signup',
  authLimiter,
  body('username').trim().toLowerCase()
    .isLength({ min: 2, max: 24 }).withMessage('username is 2–24 chars')
    .matches(/^[a-z0-9_]+$/).withMessage('letters, numbers, underscore only'),
  body('email').trim().isEmail().withMessage('that email looks off').normalizeEmail(),
  body('password').isLength({ min: 8, max: 200 }).withMessage('password needs 8+ chars'),
  body('displayName').optional({ checkFalsy: true }).trim().isLength({ max: 60 }),
  htmlGuard('auth/signup'),
  async (req, res, next) => {
    try {
      const exists = await User.findOne({ $or: [{ email: req.body.email }, { username: req.body.username }] });
      if (exists) {
        return res.status(400).render('auth/signup', {
          errors: ['that username or email is already taken'],
          form: req.body
        });
      }
      const user = await User.signup(req.body);
      req.session.user = user.toSession();
      req.session.save(err => err ? next(err) : res.redirect('/'));
    } catch (e) { next(e); }
  }
);

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('auth/login', { errors: null, form: {}, next: req.query.next || '' });
});

router.post('/login',
  authLimiter,
  body('login').trim().notEmpty().withMessage('username or email please'),
  body('password').notEmpty().withMessage('password please'),
  htmlGuard('auth/login', (req) => ({ next: req.body.next || req.query.next || '' })),
  async (req, res, next) => {
    try {
      const user = await User.findByLogin(req.body.login);
      const ok = user && await user.verifyPassword(req.body.password);
      if (!ok) {
        return res.status(401).render('auth/login', {
          errors: ['wrong username or password'],
          form: req.body,
          next: req.body.next || ''
        });
      }
      req.session.user = user.toSession();
      const dest = req.body.next && req.body.next.startsWith('/') ? req.body.next : '/';
      req.session.save(err => err ? next(err) : res.redirect(dest));
    } catch (e) { next(e); }
  }
);

router.post('/logout', (req, res, next) => {
  req.session.destroy(err => {
    if (err) return next(err);
    res.clearCookie('cm.sid');
    res.redirect('/');
  });
});

module.exports = router;
