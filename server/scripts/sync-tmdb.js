const mongoose = require('mongoose');
const cfg = require('../src/config');
const { syncTmdbToCatalog } = require('../src/services/tmdbService');

(async () => {
  console.log('Connecting to database...');
  await mongoose.connect(cfg.mongoUri);

  console.log('Fetching live Now Playing movies from TMDB and syncing into CineBook catalog...');
  const movies = await syncTmdbToCatalog(12);

  console.log(`\nSuccessfully synchronized ${movies.length} live movies from TMDB:`);
  movies.forEach((m, idx) => {
    console.log(`  ${idx + 1}. ${m.title} [${m.durationMins}m] (${m.genres.join(', ')})`);
    console.log(`     Poster: ${m.posterUrl}`);
  });

  await mongoose.disconnect();
  console.log('\nDatabase synchronization complete.');
})().catch((err) => {
  console.error('TMDB sync failed:', err);
  process.exit(1);
});

