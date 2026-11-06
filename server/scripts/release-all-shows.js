const mongoose = require('mongoose');
const cfg = require('../src/config');
const M = require('../src/models');
const { buildLayout } = require('../src/utils/layout');

const EVENT_TITLES = [
  '🌟 Premiere Fan Screening',
  '🍿 Midnight Popcorn Fest',
  '🎧 Dolby Atmos 7.1 Showcase',
  '🎭 Director Sneak Peek & Featurette',
  '🏆 IMAX 3D Blockbuster Fan Experience',
  '⚡ Early Access Weekend Gala',
];

const EVENT_PERKS_LIST = [
  ['Free Popcorn & Soft Drink', 'Collector M-Ticket Pass', 'Dolby Atmos Sound'],
  ['Complimentary Cold Beverage', 'Early Gate Entry Pass', 'Collector Pin'],
  ['Special Merchandise Mini-Poster', 'Reserved Recliner Seating', 'Dolby 7.1'],
  ['Director Video Introduction', 'Complimentary Gourmet Snack', 'Express Check-in'],
];

(async () => {
  console.log('Connecting to database:', cfg.mongoUri);
  await mongoose.connect(cfg.mongoUri);

  console.log('Ensuring all premier theatres and screens exist...');
  const theatreConfigs = [
    { name: 'Starlight Cinemas', city: 'Jalandhar' },
    { name: 'Grand Palace', city: 'Phagwara' },
    { name: 'PVR INOX: Palladium', city: 'Mumbai' },
    { name: 'Cinépolis VIP: Select Citywalk', city: 'Delhi-NCR' },
    { name: 'PVR Forum: Koramangala', city: 'Bengaluru' },
    { name: 'Odeon Luxe: Leicester Square', city: 'London' },
  ];

  const theatres = [];
  for (const tc of theatreConfigs) {
    let th = await M.Theatre.findOne({ name: tc.name });
    if (!th) {
      th = await M.Theatre.create(tc);
    }
    theatres.push(th);
  }

  const sectionsStandard = [
    { category: 'STANDARD', rows: 4, seatsPerRow: 10 },
    { category: 'PREMIUM', rows: 3, seatsPerRow: 10 },
    { category: 'RECLINER', rows: 1, seatsPerRow: 6 },
  ];
  const sectionsImax = [
    { category: 'STANDARD', rows: 5, seatsPerRow: 12 },
    { category: 'PREMIUM', rows: 4, seatsPerRow: 12 },
    { category: 'RECLINER', rows: 2, seatsPerRow: 8 },
  ];

  const allScreens = [];
  for (const th of theatres) {
    let s1 = await M.Screen.findOne({ theatre: th._id, name: 'Screen 1 (IMAX Laser)' });
    if (!s1) {
      s1 = await M.Screen.create({ theatre: th._id, name: 'Screen 1 (IMAX Laser)', layout: buildLayout(sectionsImax) }).catch(() => null);
    }
    let s2 = await M.Screen.findOne({ theatre: th._id, name: 'Screen 2 (Dolby Atmos)' });
    if (!s2) {
      s2 = await M.Screen.create({ theatre: th._id, name: 'Screen 2 (Dolby Atmos)', layout: buildLayout(sectionsStandard) }).catch(() => null);
    }
    let s3 = await M.Screen.findOne({ theatre: th._id, name: 'Audi A (Gold Class)' });
    if (!s3) {
      s3 = await M.Screen.create({ theatre: th._id, name: 'Audi A (Gold Class)', layout: buildLayout(sectionsStandard) }).catch(() => null);
    }

    const thScreens = await M.Screen.find({ theatre: th._id });
    allScreens.push(...thScreens);
  }

  console.log(`Available screens across all cities: ${allScreens.length}`);

  const movies = await M.Movie.find({ active: true });
  console.log(`Found ${movies.length} active movies in catalog.`);

  console.log('Clearing old shows and generating fresh 7-day schedule with event experiences and released tickets...');
  await M.Show.deleteMany({ startsAt: { $gte: new Date(Date.now() - 3600e3) } });

  const prices = { STANDARD: 200, PREMIUM: 320, RECLINER: 500 };
  const timeSlots = [10.0, 13.5, 16.75, 19.75, 22.75]; // 10:00 AM, 1:30 PM, 4:45 PM, 7:45 PM, 10:45 PM
  let createdCount = 0;

  for (let day = 0; day < 7; day++) {
    for (let mIdx = 0; mIdx < movies.length; mIdx++) {
      const movie = movies[mIdx];
      // Pick 2-3 screens in different theatres for each movie each day
      const screenIndices = [
        (mIdx + day * 2) % allScreens.length,
        (mIdx + day * 2 + 3) % allScreens.length,
      ];

      for (let sIdx of screenIndices) {
        const screen = allScreens[sIdx];
        const slotHour = timeSlots[(mIdx + day + sIdx) % timeSlots.length];

        const startsAt = new Date();
        startsAt.setDate(startsAt.getDate() + day);
        const hours = Math.floor(slotHour);
        const mins = Math.round((slotHour % 1) * 60);
        startsAt.setHours(hours, mins, 0, 0);

        if (startsAt <= new Date(Date.now() + 1200e3)) continue;

        const duration = movie.durationMins || 120;
        const endsAt = new Date(startsAt.getTime() + (duration + 20) * 60000);

        // Check screen clash
        const clash = await M.Show.findOne({
          screen: screen._id,
          status: 'SCHEDULED',
          startsAt: { $lt: endsAt },
          endsAt: { $gt: startsAt },
        });

        if (!clash) {
          const eventIndex = (mIdx + day + createdCount) % EVENT_TITLES.length;
          const perksIndex = (mIdx + day) % EVENT_PERKS_LIST.length;

          await M.Show.create({
            movie: movie._id,
            screen: screen._id,
            startsAt,
            endsAt,
            format: movie.formats && movie.formats.length ? movie.formats[(mIdx + day) % movie.formats.length] : '2D',
            language: movie.language || 'English',
            prices,
            status: 'SCHEDULED',
            eventTitle: EVENT_TITLES[eventIndex],
            eventPerks: EVENT_PERKS_LIST[perksIndex],
            isEventSpecial: true,
          });
          createdCount++;
        }
      }
    }
  }

  console.log(`\n🎉 Successfully scheduled ${createdCount} upcoming shows with special event screening experiences & released tickets!`);
  const sampleShow = await M.Show.findOne({ startsAt: { $gte: new Date() } })
    .populate('movie', 'title')
    .populate({ path: 'screen', populate: { path: 'theatre' } })
    .lean();

  console.log('Sample Released Show:');
  console.log({
    movie: sampleShow.movie.title,
    theatre: sampleShow.screen.theatre.name,
    city: sampleShow.screen.theatre.city,
    time: sampleShow.startsAt,
    format: sampleShow.format,
    eventTitle: sampleShow.eventTitle,
    eventPerks: sampleShow.eventPerks,
  });

  await mongoose.disconnect();
})().catch((err) => {
  console.error('Show release failed:', err);
  process.exit(1);
});

