// Wipes the configured database and loads dummy demo data. Demo credentials are printed at the end.
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cfg = require('../src/config');
const M = require('../src/models');
const { buildLayout } = require('../src/utils/layout');

const movies = [
  ['Midnight Express', 'Thriller', 'Hindi', 128, 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80'],
  ['Stellar Drift', 'Sci-Fi', 'English', 142, 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=600&q=80'],
  ['Laughter Lane', 'Comedy', 'Hindi', 115, 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?auto=format&fit=crop&w=600&q=80'],
  ['The Last Monsoon', 'Drama', 'Punjabi', 135, 'https://images.unsplash.com/photo-1514632595-4944383f2737?auto=format&fit=crop&w=600&q=80'],
  ['Cyber Samurai', 'Action', 'English', 120, 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80'],
  ['Garden of Echoes', 'Romance', 'Tamil', 150, 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80'],
];

(async () => {
  await mongoose.connect(cfg.mongoUri);
  await Promise.all(Object.values(M).filter((m) => m.deleteMany).map((m) => m.deleteMany({})));
  await M.syncAll();

  const hash = (p) => bcrypt.hash(p, 10);
  await M.User.create([
    { name: 'Demo Admin', email: 'admin@cinema.test', passwordHash: await hash('Admin@12345'), role: 'admin' },
    { name: 'Demo Staff', email: 'staff@cinema.test', passwordHash: await hash('Staff@12345'), role: 'staff' },
    { name: 'Demo Customer', email: 'customer@cinema.test', passwordHash: await hash('Customer@12345'), role: 'customer' },
  ]);

  const mv = await M.Movie.create(movies.map(([title, g, language, durationMins, posterUrl], i) => ({
    title, genres: [g], language, durationMins, formats: i % 2 ? ['2D', '3D'] : ['2D'], rating: i % 3 ? 'U/A' : 'A',
    description: `${title} — a ${g.toLowerCase()} feature (demo data).`,
    posterUrl,
  })));
  const [t1, t2] = await M.Theatre.create([{ name: 'Starlight Cinemas', city: 'Jalandhar' }, { name: 'Grand Palace', city: 'Phagwara' }]);
  const sections = [{ category: 'STANDARD', rows: 4, seatsPerRow: 10 }, { category: 'PREMIUM', rows: 3, seatsPerRow: 10 }, { category: 'RECLINER', rows: 1, seatsPerRow: 6 }];
  const screens = await M.Screen.create([
    { theatre: t1._id, name: 'Screen 1', layout: buildLayout(sections) },
    { theatre: t1._id, name: 'Screen 2', layout: buildLayout([{ category: 'STANDARD', rows: 5, seatsPerRow: 8 }, { category: 'PREMIUM', rows: 2, seatsPerRow: 8 }]) },
    { theatre: t2._id, name: 'Audi A', layout: buildLayout(sections) },
  ]);

  const prices = { STANDARD: 200, PREMIUM: 320, RECLINER: 500 };
  const slots = [10, 14, 18, 21.5];
  const shows = [];
  for (let day = 0; day < 7; day++) {
    screens.forEach((screen, si) => {
      slots.forEach((h, k) => {
        const movie = mv[(day + si + k) % mv.length];
        const startsAt = new Date();
        startsAt.setDate(startsAt.getDate() + day);
        startsAt.setHours(Math.floor(h), (h % 1) * 60, 0, 0);
        if (startsAt <= new Date(Date.now() + 3600e3)) return;
        shows.push({ movie: movie._id, screen: screen._id, startsAt, endsAt: new Date(startsAt.getTime() + (movie.durationMins + 15) * 60000),
          format: movie.formats[k % movie.formats.length], language: movie.language, prices: screen.layout.some((r) => r.category === 'RECLINER') ? prices : { STANDARD: 180, PREMIUM: 280 } });
      });
    });
  }
  // Slots are 3.5-4h apart and movies are <= 150 min, so shows on one screen never overlap.
  await M.Show.create(shows);

  console.log(`Seeded ${mv.length} movies, 2 theatres, ${screens.length} screens, ${shows.length} shows.`);
  console.log('Demo logins (dummy):\n  admin@cinema.test / Admin@12345\n  staff@cinema.test / Staff@12345\n  customer@cinema.test / Customer@12345');
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
