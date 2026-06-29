const router = require('express').Router();
const User = require('../models/User');
const tmdb = require('../services/tmdb');
const { requireAuth } = require('../middleware');

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const u = await User.findById(req.session.user.id).select('watchlist').lean();
    const items = (u && u.watchlist) || [];
    items.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
    res.json({ items });
  } catch (e) { next(e); }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const tmdbId = Number(req.body && req.body.tmdbId);
    if (!tmdbId) return res.status(400).json({ error: 'tmdbId required' });

    const u = await User.findById(req.session.user.id);
    if (!u) return res.status(404).json({ error: 'no user' });
    if (u.watchlist.some(w => w.tmdbId === tmdbId)) {
      return res.json({ ok: true, already: true });
    }

    let title = String(req.body.title || '').slice(0, 120);
    let year = req.body.year ? Number(req.body.year) : null;
    let poster = String(req.body.poster || '').slice(0, 400);

    if (!title || !poster) {
      const film = await tmdb.detail(tmdbId).catch(() => null);
      if (film) {
        title = title || film.title || '';
        year = year || film.year || null;
        poster = poster || film.poster || '';
      }
    }

    u.watchlist.unshift({
      tmdbId,
      title,
      year,
      poster,
      fromBoardSlug: String(req.body.fromBoardSlug || '').slice(0, 80)
    });
    if (u.watchlist.length > 200) u.watchlist = u.watchlist.slice(0, 200);
    await u.save();

    res.status(201).json({ ok: true, item: u.watchlist[0] });
  } catch (e) { next(e); }
});

router.delete('/:tmdbId', requireAuth, async (req, res, next) => {
  try {
    const tmdbId = Number(req.params.tmdbId);
    await User.updateOne(
      { _id: req.session.user.id },
      { $pull: { watchlist: { tmdbId } } }
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
