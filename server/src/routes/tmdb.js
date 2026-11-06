const router = require('express').Router();
const tmdb = require('../services/tmdbService');

router.get('/now-playing', async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const data = await tmdb.getNowPlaying(page);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/trending', async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const data = await tmdb.getTrending('week', page);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/search', async (req, res, next) => {
  try {
    const q = req.query.q || '';
    if (!q.trim()) return res.json({ results: [] });
    const data = await tmdb.searchMovies(q.trim());
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post('/sync', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 20);
    const synced = await tmdb.syncTmdbToCatalog(limit);
    res.json({
      message: `Successfully synchronized ${synced.length} live movies from TMDB`,
      movies: synced.map((m) => ({ id: m._id, title: m.title, posterUrl: m.posterUrl })),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/status', async (_req, res) => {
  try {
    const data = await tmdb.getNowPlaying(1);
    res.json({ ok: true, source: 'The Movie Database (TMDB)', totalResults: data.total_results });
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message });
  }
});

module.exports = router;

