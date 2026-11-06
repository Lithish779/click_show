const cfg = require('../config');
const { Movie, Screen, Show, Theatre } = require('../models');

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

const GENRE_MAP = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
};

async function tmdbFetch(endpoint, params = {}) {
  const query = new URLSearchParams({
    api_key: cfg.tmdbApiKey,
    language: 'en-US',
    ...params,
  });

  const headers = { Accept: 'application/json' };
  if (cfg.tmdbReadToken) {
    headers['Authorization'] = `Bearer ${cfg.tmdbReadToken}`;
  }

  const res = await fetch(`${TMDB_BASE_URL}${endpoint}?${query}`, { headers });
  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`TMDB API error ${res.status}: ${errorText || res.statusText}`);
  }
  return res.json();
}

/**
 * Fetch Now Playing movies from TMDB
 */
async function getNowPlaying(page = 1) {
  const data = await tmdbFetch('/movie/now_playing', { page });
  return {
    ...data,
    results: (data.results || []).map(formatTmdbMovie),
  };
}

/**
 * Fetch Trending movies from TMDB
 */
async function getTrending(timeWindow = 'week', page = 1) {
  const data = await tmdbFetch(`/trending/movie/${timeWindow}`, { page });
  return {
    ...data,
    results: (data.results || []).map(formatTmdbMovie),
  };
}

/**
 * Search movies on TMDB
 */
async function searchMovies(q, page = 1) {
  const data = await tmdbFetch('/search/movie', { query: q, page });
  return {
    ...data,
    results: (data.results || []).map(formatTmdbMovie),
  };
}

/**
 * Format raw TMDB movie into standardized format with poster URLs
 */
function formatTmdbMovie(m) {
  const genres = (m.genre_ids || [])
    .map((id) => GENRE_MAP[id] || 'General')
    .slice(0, 4);

  return {
    id: m.id,
    title: m.title || m.original_title,
    description: m.overview || 'Now showing in theatres.',
    posterUrl: m.poster_path ? `${IMAGE_BASE_URL}${m.poster_path}` : '',
    backdropUrl: m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : '',
    genres: genres.length ? genres : ['General'],
    rating: m.vote_average ? `★ ${m.vote_average.toFixed(1)}` : 'U/A',
    voteAverage: m.vote_average,
    voteCount: m.vote_count,
    releaseDate: m.release_date,
    language: (m.original_language || 'en').toUpperCase(),
  };
}

/**
 * Sync live TMDB movies directly into CineBook MongoDB catalog
 * and automatically schedule showtimes on available screens.
 */
async function syncTmdbToCatalog(limit = 10) {
  const nowPlaying = await tmdbFetch('/movie/now_playing', { page: 1 });
  const rawList = (nowPlaying.results || []).slice(0, limit);
  const syncedMovies = [];

  const screens = await Screen.find().lean();
  const prices = { STANDARD: 200, PREMIUM: 320, RECLINER: 500 };

  for (let idx = 0; idx < rawList.length; idx++) {
    const raw = rawList[idx];

    // Fetch detail for precise runtime and genres
    let runtime = 120;
    let detailGenres = [];
    try {
      const details = await tmdbFetch(`/movie/${raw.id}`);
      runtime = details.runtime && details.runtime >= 20 ? details.runtime : 115 + (idx % 4) * 10;
      if (details.genres?.length) {
        detailGenres = details.genres.map((g) => g.name).slice(0, 4);
      }
    } catch (_) {
      // fallback to list data
    }

    const title = raw.title?.trim() || `Movie ${raw.id}`;
    const genres = detailGenres.length
      ? detailGenres
      : (raw.genre_ids || []).map((id) => GENRE_MAP[id] || 'General').slice(0, 4);
    if (!genres.length) genres.push('Drama');

    const posterUrl = raw.poster_path ? `${IMAGE_BASE_URL}${raw.poster_path}` : '';
    const formats = idx % 2 === 0 ? ['2D', '3D'] : ['2D', 'IMAX'];
    const rating = raw.vote_average ? (raw.vote_average >= 7 ? 'U/A' : 'A') : 'U/A';
    const lang = (raw.original_language || 'en') === 'en' ? 'English' : raw.original_language?.toUpperCase() || 'Hindi';

    // Upsert into Movie collection
    const movieDoc = await Movie.findOneAndUpdate(
      { title },
      {
        $set: {
          title,
          description: raw.overview || `${title} — now showing in cinemas.`,
          genres,
          language: lang,
          durationMins: runtime,
          formats,
          rating,
          posterUrl,
          active: true,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );
    syncedMovies.push(movieDoc);

    // If movie doesn't have upcoming scheduled shows, schedule some shows across the screens!
    const existingShows = await Show.countDocuments({
      movie: movieDoc._id,
      status: 'SCHEDULED',
      startsAt: { $gte: new Date() },
    });

    if (existingShows < 3 && screens.length) {
      const slots = [11, 14.5, 18, 21];
      for (let day = 0; day < 5; day++) {
        const screen = screens[(idx + day) % screens.length];
        const h = slots[(idx + day) % slots.length];
        const startsAt = new Date();
        startsAt.setDate(startsAt.getDate() + day);
        startsAt.setHours(Math.floor(h), (h % 1) * 60, 0, 0);

        if (startsAt <= new Date(Date.now() + 1800e3)) continue;

        const endsAt = new Date(startsAt.getTime() + (movieDoc.durationMins + 15) * 60000);
        // Avoid scheduling clashes
        const overlap = await Show.findOne({
          screen: screen._id,
          status: 'SCHEDULED',
          startsAt: { $lt: endsAt },
          endsAt: { $gt: startsAt },
        });

        if (!overlap) {
          await Show.create({
            movie: movieDoc._id,
            screen: screen._id,
            startsAt,
            endsAt,
            format: formats[day % formats.length],
            language: movieDoc.language,
            prices,
          }).catch(() => null);
        }
      }
    }
  }

  return syncedMovies;
}

module.exports = {
  tmdbFetch,
  getNowPlaying,
  getTrending,
  searchMovies,
  syncTmdbToCatalog,
};

