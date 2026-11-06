const mongoose = require('mongoose');
const cfg = require('./config');
const app = require('./app');
const { syncAll } = require('./models');

(async () => {
  await mongoose.connect(cfg.mongoUri);
  await syncAll();
  app.listen(cfg.port, () => console.log(`API on http://localhost:${cfg.port}  (docs: /api/docs)`));
})().catch((e) => {
  console.error('Failed to start:', e.message);
  process.exit(1);
});
