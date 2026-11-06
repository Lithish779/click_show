const router = require('express').Router();
const bms = require('../services/bmsFeatures');

const POPULAR_CITIES = [
  { id: 'mumbai', name: 'Mumbai', state: 'Maharashtra', icon: '🏛️', isPopular: true },
  { id: 'delhi', name: 'Delhi-NCR', state: 'Delhi', icon: '🕌', isPopular: true },
  { id: 'bengaluru', name: 'Bengaluru', state: 'Karnataka', icon: '🏢', isPopular: true },
  { id: 'hyderabad', name: 'Hyderabad', state: 'Telangana', icon: '🏰', isPopular: true },
  { id: 'chandigarh', name: 'Chandigarh', state: 'Punjab / Haryana', icon: '✋', isPopular: true },
  { id: 'ahmedabad', name: 'Ahmedabad', state: 'Gujarat', icon: '🪁', isPopular: true },
  { id: 'chennai', name: 'Chennai', state: 'Tamil Nadu', icon: '🏖️', isPopular: true },
  { id: 'kolkata', name: 'Kolkata', state: 'West Bengal', icon: '🌉', isPopular: true },
  { id: 'pune', name: 'Pune', state: 'Maharashtra', icon: '⛰️', isPopular: true },
  { id: 'kochi', name: 'Kochi', state: 'Kerala', icon: '🌴', isPopular: true },
  { id: 'jalandhar', name: 'Jalandhar', state: 'Punjab', icon: '🎬', isPopular: true },
  { id: 'phagwara', name: 'Phagwara', state: 'Punjab', icon: '🎟️', isPopular: true },
];

router.get('/offers', (_req, res) => {
  res.json({ offers: bms.OFFERS });
});

router.post('/offers/validate', (req, res) => {
  const { code, ticketCount = 1, ticketTotal = 0 } = req.body || {};
  const result = bms.validateOffer(code, Number(ticketCount), Number(ticketTotal));
  res.json(result);
});

router.get('/fnb', (_req, res) => {
  res.json({ items: bms.FNB_ITEMS });
});

router.get('/events', (req, res) => {
  const { category, city } = req.query;
  let list = [...bms.EVENTS];
  if (category) {
    list = list.filter((e) => e.category.toLowerCase() === category.toLowerCase());
  }
  if (city) {
    list = list.filter((e) => e.city.toLowerCase() === city.toLowerCase() || city.toLowerCase() === 'all');
  }
  res.json({ events: list });
});

router.get('/stream', (_req, res) => {
  res.json({ streams: bms.STREAMS });
});

router.get('/cities', (_req, res) => {
  res.json({ cities: POPULAR_CITIES });
});

module.exports = router;

