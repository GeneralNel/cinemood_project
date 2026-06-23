require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const mongoose = require('mongoose');

const { connectDb } = require('./config/db');
const csrf = require('./middleware/csrf');

const pagesRoutes = require('./routes/pages');
const authRoutes = require('./routes/auth');
const boardsRoutes = require('./routes/boards');
const filmsRoutes = require('./routes/films');
const moodRoutes = require('./routes/mood');
const feedRoutes = require('./routes/feed');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
if (isProd) app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'img-src': ["'self'", 'data:', 'https://image.tmdb.org'],
      'script-src': ["'self'"],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
      'connect-src': ["'self'"]
    }
  }
}));

app.use(express.urlencoded({ extended: true, limit: '256kb' }));
app.use(express.json({ limit: '512kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const sessionStore = process.env.MONGO_URI
  ? MongoStore.create({ mongoUrl: process.env.MONGO_URI, ttl: 60 * 60 * 24 * 14 })
  : undefined;

app.use(session({
  name: 'cm.sid',
  secret: process.env.SESSION_SECRET || 'dev-only-change-me',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 1000 * 60 * 60 * 24 * 14
  }
}));

app.use(csrf());

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.csrfToken = req.csrfToken();
  res.locals.path = req.path;
  next();
});

app.use('/', pagesRoutes);
app.use('/', authRoutes);
app.use('/api/boards', boardsRoutes);
app.use('/api/films', filmsRoutes);
app.use('/api/mood', moodRoutes);
app.use('/api/feed', feedRoutes);

app.use((req, res) => {
  res.status(404);
  if (req.path.startsWith('/api/')) return res.json({ error: 'not found' });
  res.render('404');
});

app.use((err, req, res, next) => {
  if (err && err.code === 'EBADCSRFTOKEN') {
    res.status(403);
    return req.path.startsWith('/api/')
      ? res.json({ error: 'bad csrf token' })
      : res.render('error', { message: 'session expired, try again' });
  }
  console.error(err);
  res.status(500);
  req.path.startsWith('/api/')
    ? res.json({ error: 'something broke' })
    : res.render('error', { message: 'something broke' });
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  connectDb().then(() => {
    app.listen(port, () => console.log(`cinemood up on :${port}`));
  });
}

module.exports = app;
