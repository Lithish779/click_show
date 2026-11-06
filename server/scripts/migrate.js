// Repeatable "migration": (re)creates every collection index defined in src/models. Safe to run any number of times.
const mongoose = require('mongoose');
const cfg = require('../src/config');
const { syncAll } = require('../src/models');

(async () => {
  await mongoose.connect(cfg.mongoUri);
  await syncAll();
  console.log('Indexes synchronised for', mongoose.connection.name);
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
