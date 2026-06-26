const router = require('express').Router();
const mongoose = require('mongoose');
const requireAuth = require('../middleware/requireAuth');
const tmdb = require('../services/tmdb');

const HOME_CHIPS = [
  'rainy-sunday', 'neon-noir', '3am', 'first-date', 'need-laugh',
  'need-cry', 'snowed-in', 'red-wine-rain', 'glow-up', 'summer-fever',
  'autumn-dread', 'lonely-apt', 'dinner-party'
];

const BUCKET_TAGS = {
  morning:   ['spring-renewal', 'road-trip', 'friday-recharge', 'just-paid', 'need-laugh'],
  afternoon: ['need-laugh', 'just-paid', 'dinner-party', 'first-date', 'summer-fever'],
  evening:   ['red-wine-rain', 'dinner-party', 'glow-up', 'neon-noir', 'first-date', 'need-cry'],
  night:     ['3am', 'lonely-apt', 'existential', 'autumn-dread', 'neon-noir', 'red-wine-rain']
};

const BUCKET_LABEL = {
  morning: 'morning',
  afternoon: 'afternoon',
  evening: 'evening',
  night: 'late night'
};

function bucketFor(hour) {
  if (hour >= 5 && hour <= 11) return 'morning';
  if (hour >= 12 && hour <= 17) return 'afternoon';
  if (hour >= 18 && hour <= 22) return 'evening';
  return 'night';
}

function chipsForHome() {
  const mc = require('../data/moodCards.json');
  const byId = Object.fromEntries(mc.map(c => [c.id, c]));
  return HOME_CHIPS.map(id => byId[id]).filter(Boolean);
}

router.get('/', async (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  const q = String(req.query.q || '').trim().slice(0, 80);
  const boardQ = String(req.query.board_q || '').trim().slice(0, 80);
  const activeMood = String(req.query.mood || '').trim().slice(0, 40);
  const bucket = bucketFor(new Date().getHours());
  const bucketLabel = BUCKET_LABEL[bucket];

  const ctx = {
    q,
    boardQ,
    activeMood,
    bucket,
    bucketLabel,
    moodChips: chipsForHome(),
    shelf: [],
    tonight: [],
    fresh: [],
    watchlist: [],
    films: []
  };

  if (!dbReady) return res.render('home', ctx);

  try {
    const Board = require('../models/Board');
    const User = require('../models/User');

    if (q) {
      ctx.films = await tmdb.search(q).catch(() => []);
      return res.render('home', ctx);
    }

    if (boardQ) {
      const rx = new RegExp(boardQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const filter = {
        $and: [
          req.session.user
            ? { $or: [{ visibility: 'public' }, { owner: req.session.user.id }] }
            : { visibility: 'public' },
          { $or: [{ title: rx }, { moodTags: rx }, { slug: rx }] }
        ]
      };
      ctx.tonight = await Board.find(filter)
        .sort('-updatedAt')
        .limit(60)
        .populate('owner', 'username displayName')
        .lean();
      return res.render('home', ctx);
    }

    if (req.session.user) {
      ctx.shelf = await Board.find({ owner: req.session.user.id })
        .sort('-updatedAt').limit(12).lean();
      ctx.shelf.forEach(b => { b.owner = { username: req.session.user.username, displayName: req.session.user.displayName }; });
      const u = await User.findById(req.session.user.id).select('watchlist').lean();
      ctx.watchlist = ((u && u.watchlist) || []).slice(0, 24);
    }

    const tags = activeMood ? [activeMood] : BUCKET_TAGS[bucket];
    ctx.tonight = await Board.find({ visibility: 'public', moodTags: { $in: tags } })
      .sort('-updatedAt')
      .limit(24)
      .populate('owner', 'username displayName')
      .lean();

    const tonightIds = ctx.tonight.map(b => b._id);
    ctx.fresh = await Board.find({ visibility: 'public', _id: { $nin: tonightIds } })
      .sort('-updatedAt')
      .limit(24)
      .populate('owner', 'username displayName')
      .lean();

    res.render('home', ctx);
  } catch (e) {
    console.error(e);
    res.render('home', ctx);
  }
});

router.get('/dashboard', requireAuth, (req, res) => {
  res.redirect('/u/' + req.session.user.username);
});

router.get('/create', requireAuth, (req, res) => {
  res.render('compose');
});

router.get('/settings', requireAuth, (req, res) => {
  res.render('settings');
});

router.get('/board/:slug/edit', requireAuth, async (req, res, next) => {
  try {
    const Board = require('../models/Board');
    const board = await Board.findOne({ slug: req.params.slug, owner: req.session.user.id }).lean();
    if (!board) return res.status(404).render('404');
    const stickers = require('../data/stickers.json');
    res.render('board/edit', { board, stickers });
  } catch (e) { next(e); }
});

router.get('/board/:slug', async (req, res, next) => {
  try {
    const Board = require('../models/Board');
    const board = await Board.findOne({ slug: req.params.slug }).populate('owner', 'username displayName').lean();
    if (!board) return res.status(404).render('404');
    const isOwner = req.session.user && String(board.owner._id) === req.session.user.id;
    if (board.visibility === 'private' && !isOwner) return res.status(404).render('404');

    const seen = new Set();
    const films = [];
    for (const el of board.elements || []) {
      if (el.type !== 'poster' || !el.payload || !el.payload.tmdbId) continue;
      if (seen.has(el.payload.tmdbId)) continue;
      seen.add(el.payload.tmdbId);
      films.push({
        tmdbId: el.payload.tmdbId,
        title: el.payload.title,
        year: el.payload.year,
        poster: el.payload.poster
      });
    }

    let moreLike = [];
    if (board.moodTags && board.moodTags.length) {
      moreLike = await Board.find({
        visibility: 'public',
        _id: { $ne: board._id },
        moodTags: { $in: board.moodTags }
      })
        .sort('-updatedAt')
        .limit(12)
        .populate('owner', 'username displayName')
        .lean();
    }

    const stickers = require('../data/stickers.json');
    res.render('board/view', { board, stickers, isOwner, films, moreLike });
  } catch (e) { next(e); }
});

router.get('/u/:username', async (req, res, next) => {
  try {
    const dbReady = mongoose.connection.readyState === 1;
    if (!dbReady) return res.status(404).render('404');
    const User = require('../models/User');
    const Board = require('../models/Board');
    const u = await User.findOne({ username: req.params.username.toLowerCase() }).lean();
    if (!u) return res.status(404).render('404');
    const isSelf = req.session.user && String(u._id) === req.session.user.id;
    const filter = isSelf ? { owner: u._id } : { owner: u._id, visibility: 'public' };
    const boards = await Board.find(filter).sort('-updatedAt').lean();
    boards.forEach(b => { b.owner = { username: u.username, displayName: u.displayName }; });
    res.render('profile', { profile: u, boards, isSelf });
  } catch (e) { next(e); }
});

module.exports = router;
