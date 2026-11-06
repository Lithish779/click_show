const QRCode = require('qrcode');

const OFFERS = [
  {
    code: 'BMS50',
    title: 'Flat ₹50 Off on Tickets',
    description: 'Use code BMS50 and get flat ₹50 discount on booking of 2 or more tickets.',
    discountType: 'FLAT',
    discountValue: 50,
    minTickets: 2,
    bank: 'ClickShow Exclusive',
    badge: 'Trending',
  },
  {
    code: 'ICICIRUSH',
    title: 'ICICI Bank 20% Instant Discount',
    description: 'Get 20% instant discount up to ₹150 using ICICI Bank Credit or Debit cards.',
    discountType: 'PERCENT',
    discountValue: 20,
    maxDiscount: 150,
    minAmount: 300,
    bank: 'ICICI Bank',
    badge: 'Popular',
  },
  {
    code: 'BOGO',
    title: 'Buy 1 Get 1 Free on Axis Bank Cards',
    description: 'Buy one ticket and get the second ticket free (up to ₹250 discount) with Axis Bank Cards.',
    discountType: 'BOGO',
    maxDiscount: 250,
    minTickets: 2,
    bank: 'Axis Bank',
    badge: 'BOGO',
  },
  {
    code: 'HDFCSHOW',
    title: 'HDFC Bank Weekend Treat - ₹100 Off',
    description: 'Get flat ₹100 discount on bookings above ₹400 using HDFC Bank Cards.',
    discountType: 'FLAT',
    discountValue: 100,
    minAmount: 400,
    bank: 'HDFC Bank',
    badge: 'Weekend Special',
  },
  {
    code: 'CASHBACK30',
    title: 'Flat ₹30 Cashback via UPI',
    description: 'Pay using Google Pay, PhonePe or Paytm UPI and receive instant ₹30 cashback.',
    discountType: 'FLAT',
    discountValue: 30,
    minAmount: 200,
    bank: 'Any UPI',
    badge: 'UPI Offer',
  },
];

const FNB_ITEMS = [
  {
    id: 'fnb-1',
    name: 'Jumbo Butter Popcorn (Salted)',
    category: 'Popcorn',
    price: 290,
    veg: true,
    description: 'Freshly popped warm golden corn tossed with generous melting butter.',
    image: 'https://images.unsplash.com/photo-1572177191856-3cde618dee1f?w=400&auto=format&fit=crop&q=80',
    badge: 'Bestseller',
  },
  {
    id: 'fnb-2',
    name: 'Cheese & Caramel Gourmet Popcorn Combo',
    category: 'Popcorn',
    price: 340,
    veg: true,
    description: 'The ultimate cinema indulgence: sweet crunchy caramel paired with sharp cheddar cheese.',
    image: 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=400&auto=format&fit=crop&q=80',
    badge: 'Gourmet',
  },
  {
    id: 'fnb-3',
    name: 'Loaded Cheesy Nachos with Salsa Dip',
    category: 'Snacks',
    price: 220,
    veg: true,
    description: 'Crisp Mexican corn tortilla chips served with hot cheddar cheese sauce and tangy salsa.',
    image: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=400&auto=format&fit=crop&q=80',
    badge: 'Must Have',
  },
  {
    id: 'fnb-4',
    name: 'Crispy Veg Herb Burger + Fries',
    category: 'Meals',
    price: 260,
    veg: true,
    description: 'Golden fried vegetable patty topped with melted cheese, crisp lettuce and seasoned fries.',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'fnb-5',
    name: 'Gourmet Chicken Royale Burger',
    category: 'Meals',
    price: 310,
    veg: false,
    description: 'Succulent grilled chicken breast with caramelized onions, chipotle mayo in a toasted brioche bun.',
    image: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'fnb-6',
    name: 'Fountain Soda (Large 650ml - Pepsi / 7Up)',
    category: 'Beverages',
    price: 150,
    veg: true,
    description: 'Chilled bubbly carbonated soft drink to accompany your snacks.',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'fnb-7',
    name: 'Hot Hazelnut Cafe Mocha (300ml)',
    category: 'Beverages',
    price: 180,
    veg: true,
    description: 'Freshly brewed espresso infused with rich cocoa and roasted hazelnut syrup.',
    image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'fnb-8',
    name: 'Woodfired Margherita Pizza Slice',
    category: 'Snacks',
    price: 210,
    veg: true,
    description: 'Neapolitan style thin crust with San Marzano tomato sauce, fresh mozzarella & basil.',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&auto=format&fit=crop&q=80',
  },
];

const EVENTS = [
  {
    id: 'evt-1',
    title: 'Arijit Singh — Live in Symphony Tour 2026',
    category: 'Events',
    type: 'Music Concert',
    language: 'Hindi',
    city: 'Mumbai',
    venue: 'Jio World Garden, BKC',
    date: '2026-11-20T19:00:00Z',
    priceFrom: 1499,
    rating: '★ 9.8',
    poster: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    tags: ['Live Band', 'Grand Arena', 'Trending #1', 'Dolby Live'],
    shows: [
      { id: 'evt-1-s1', dateLabel: 'Fri, 20 Nov', time: '07:00 PM', title: 'Opening Gala Night', available: 140 },
      { id: 'evt-1-s2', dateLabel: 'Sat, 21 Nov', time: '08:00 PM', title: 'Grand Weekend Showcase', available: 85 },
      { id: 'evt-1-s3', dateLabel: 'Sun, 22 Nov', time: '06:30 PM', title: 'Acoustic Finale Session', available: 42 },
    ],
    tiers: [
      { name: 'VIP Lounge Pass', price: 2999, perks: 'Front stage lounge, complimentary beverage & snacks, fast-track entry' },
      { name: 'Fan Pit (Stage Front)', price: 1999, perks: 'Closest to stage, high energy standing zone, commemorative lanyard' },
      { name: 'Gold Reserved Seating', price: 1499, perks: 'Elevated tiered seating, crystal clear line of sight' },
      { name: 'Silver General Admission', price: 999, perks: 'Standard arena admission' },
    ],
  },
  {
    id: 'evt-2',
    title: 'Zakir Khan — Tathastu Worldwide Comedy',
    category: 'Events',
    type: 'Standup Comedy',
    language: 'Hindi',
    city: 'Delhi-NCR',
    venue: 'Sirifort Auditorium, August Kranti Marg',
    date: '2026-11-22T20:00:00Z',
    priceFrom: 799,
    rating: '★ 9.7',
    poster: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=600&auto=format&fit=crop&q=80',
    tags: ['Standup Comedy', 'Superhit', 'Filling Fast', 'Sakht Launda'],
    shows: [
      { id: 'evt-2-s1', dateLabel: 'Sat, 21 Nov', time: '05:30 PM', title: 'Early Evening Special', available: 110 },
      { id: 'evt-2-s2', dateLabel: 'Sat, 21 Nov', time: '08:30 PM', title: 'Prime Night Show', available: 32 },
      { id: 'evt-2-s3', dateLabel: 'Sun, 22 Nov', time: '07:00 PM', title: 'Sunday Gala Special', available: 75 },
    ],
    tiers: [
      { name: 'VIP Front Rows (A-C)', price: 1799, perks: 'Front 3 rows, artist meet & greet photo opportunity' },
      { name: 'Premium Platinum (D-H)', price: 1299, perks: 'Center auditorium prime acoustics' },
      { name: 'Gold Tier (J-P)', price: 999, perks: 'Excellent central view' },
      { name: 'Silver Balcony', price: 799, perks: 'Elevated balcony reserved seats' },
    ],
  },
  {
    id: 'evt-3',
    title: 'India vs Australia — World T20 Stadium Screening',
    category: 'Sports',
    type: 'Cricket Screening',
    language: 'English / Hindi',
    city: 'Bengaluru',
    venue: 'Chinnaswamy Stadium Fan Park & PVR Cinemas',
    date: '2026-11-15T14:30:00Z',
    priceFrom: 350,
    rating: '★ 9.9',
    poster: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=600&auto=format&fit=crop&q=80',
    tags: ['Big Screen 4K', 'Stadium Sound', 'Mega Hit', 'Cheer Park'],
    shows: [
      { id: 'evt-3-s1', dateLabel: 'Sun, 15 Nov', time: '02:30 PM', title: 'Pre-Match Toss & Live Innings', available: 220 },
      { id: 'evt-3-s2', dateLabel: 'Sun, 15 Nov', time: '06:00 PM', title: 'Death Overs & Championship Chase', available: 95 },
    ],
    tiers: [
      { name: 'VIP Dugout Pass', price: 999, perks: 'Air-conditioned luxury lounge, unlimited stadium snacks & jersey' },
      { name: 'Grandstand 4K Arena', price: 650, perks: 'Direct front giant LED screen view, team flag & whistle' },
      { name: 'Fan Zone Standard', price: 350, perks: 'High-energy stadium fan park seating' },
    ],
  },
  {
    id: 'evt-4',
    title: 'Mughal-e-Azam: The Grand Musical',
    category: 'Plays',
    type: 'Theatre Drama',
    language: 'Urdu / Hindi',
    city: 'Chandigarh',
    venue: 'Tagore Theatre, Sector 18',
    date: '2026-11-25T18:30:00Z',
    priceFrom: 999,
    rating: '★ 9.6',
    poster: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=600&auto=format&fit=crop&q=80',
    tags: ['Broadway Style', 'Costumes by Manish Malhotra', 'Live Kathak'],
    shows: [
      { id: 'evt-4-s1', dateLabel: 'Fri, 24 Nov', time: '06:30 PM', title: 'Opening Curtain Premiere', available: 90 },
      { id: 'evt-4-s2', dateLabel: 'Sat, 25 Nov', time: '03:00 PM', title: 'Royal Matinee Show', available: 65 },
      { id: 'evt-4-s3', dateLabel: 'Sat, 25 Nov', time: '07:30 PM', title: 'Royal Evening Gala', available: 28 },
    ],
    tiers: [
      { name: 'Royal Box / Shahi Dalaan', price: 2499, perks: 'Private royal box, commemorative book & Manish Malhotra souvenir' },
      { name: 'Courtyard Diamond', price: 1699, perks: 'Orchestra center rows, live orchestra immersion' },
      { name: 'Ruby Stalls', price: 1299, perks: 'Clear stage line of sight' },
      { name: 'Emerald Tier', price: 999, perks: 'Standard tier reserved seating' },
    ],
  },
  {
    id: 'evt-5',
    title: 'Sunburn Arena ft. Martin Garrix & Friends',
    category: 'Events',
    type: 'EDM Festival',
    language: 'English',
    city: 'Hyderabad',
    venue: 'GMR Arena, Shamshabad',
    date: '2026-11-28T16:00:00Z',
    priceFrom: 1800,
    rating: '★ 9.5',
    poster: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=600&auto=format&fit=crop&q=80',
    tags: ['EDM', 'Laser Show', 'Youth Choice', 'Pyrotechnics'],
    shows: [
      { id: 'evt-5-s1', dateLabel: 'Sat, 28 Nov', time: '04:00 PM', title: 'Sunset Warm-up & Headliner Set', available: 310 },
      { id: 'evt-5-s2', dateLabel: 'Sun, 29 Nov', time: '04:00 PM', title: 'Day 2 Mega Stage Blast', available: 180 },
    ],
    tiers: [
      { name: 'VVIP Elevated Deck Pass', price: 4500, perks: 'Elevated viewing platform, dedicated bar & VVIP parking' },
      { name: 'Fan Pit (Stage Front)', price: 2800, perks: 'Front of stage, laser & CO2 blast immersion' },
      { name: 'GA Early Bird Pass', price: 1800, perks: 'General admission arena access' },
    ],
  },
  {
    id: 'evt-6',
    title: 'Punjab Super Kings Fan Fest & Match Day',
    category: 'Sports',
    type: 'Sports Screening',
    language: 'Punjabi / Hindi',
    city: 'Jalandhar',
    venue: 'Olympian Surjit Hockey Stadium Arena',
    date: '2026-11-18T19:30:00Z',
    priceFrom: 299,
    rating: '★ 9.3',
    poster: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&auto=format&fit=crop&q=80',
    tags: ['Cheer Squad', 'Food Trucks', 'Jalandhar Special', 'Dhol & Bhangra'],
    shows: [
      { id: 'evt-6-s1', dateLabel: 'Wed, 18 Nov', time: '07:30 PM', title: 'Blockbuster Match Night', available: 240 },
      { id: 'evt-6-s2', dateLabel: 'Sat, 21 Nov', time: '07:30 PM', title: 'Weekend Derby Clash', available: 160 },
    ],
    tiers: [
      { name: 'Club House Lounge', price: 799, perks: 'Buffet dinner, front screen lounge & jersey' },
      { name: 'Bleacher Fan Zone', price: 499, perks: 'Dhol squad zone, team kit & beverages' },
      { name: 'General Admission', price: 299, perks: 'Stadium open seating' },
    ],
  },
  {
    id: 'evt-7',
    title: 'Coldplay: Music of the Spheres Stadium Tour',
    category: 'Events',
    type: 'Music Concert',
    language: 'English',
    city: 'Mumbai',
    venue: 'DY Patil Stadium, Navi Mumbai',
    date: '2026-11-30T18:00:00Z',
    priceFrom: 2500,
    rating: '★ 9.9',
    poster: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&auto=format&fit=crop&q=80',
    tags: ['Global Tour', 'LED Wristbands', 'Stadium Spectacle', 'Bestseller'],
    shows: [
      { id: 'evt-7-s1', dateLabel: 'Sun, 29 Nov', time: '06:00 PM', title: 'Night 1 Mumbai Sphere', available: 120 },
      { id: 'evt-7-s2', dateLabel: 'Mon, 30 Nov', time: '06:00 PM', title: 'Night 2 Mumbai Encore', available: 65 },
    ],
    tiers: [
      { name: 'Infinity Lounge Pass', price: 6500, perks: 'Best views, pre-show reception, eco wristband & tour gifts' },
      { name: 'Floor Standing (Front)', price: 3999, perks: 'Floor access right next to B-stage & C-stage' },
      { name: 'Lower Tier Seated (L1)', price: 2999, perks: 'Reserved prime stadium seating' },
      { name: 'Upper Tier Seated (L2)', price: 2500, perks: 'Full panoramic stadium light show view' },
    ],
  },
  {
    id: 'evt-8',
    title: 'UEFA Champions League Final — Live 4K Fan Park',
    category: 'Sports',
    type: 'Football Screening',
    language: 'English',
    city: 'London',
    venue: 'Wembley Stadium Arena Fan Zone',
    date: '2026-11-29T20:00:00Z',
    priceFrom: 450,
    rating: '★ 9.7',
    poster: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=80',
    tags: ['4K Mega Screen', 'Pint & Pie Included', 'Football Fans'],
    shows: [
      { id: 'evt-8-s1', dateLabel: 'Sat, 28 Nov', time: '07:30 PM', title: 'Final Kickoff Live Screening', available: 200 },
    ],
    tiers: [
      { name: 'Captain’s Lounge', price: 1200, perks: 'Premium craft beer, hot artisan pies & padded seats' },
      { name: 'Supporters Stand', price: 650, perks: 'Chant section with stadium audio system' },
      { name: 'General Admission', price: 450, perks: 'Standard fan park admission' },
    ],
  },
];

const STREAMS = [
  {
    id: 'str-1',
    title: 'Interstellar Odyssey: Beyond Time',
    genre: 'Sci-Fi / Space',
    duration: '2h 45m',
    releaseYear: 2026,
    rating: '★ 9.1',
    rentPrice: 199,
    buyPrice: 499,
    poster: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
    tag: 'Exclusive Premiere',
  },
  {
    id: 'str-2',
    title: 'Echoes of the Valley',
    genre: 'Mystery / Thriller',
    duration: '2h 10m',
    releaseYear: 2026,
    rating: '★ 8.7',
    rentPrice: 149,
    buyPrice: 399,
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    tag: 'Film Festival Winner',
  },
  {
    id: 'str-3',
    title: 'Cyber Samurai 2099',
    genre: 'Action / Cyberpunk',
    duration: '2h 05m',
    releaseYear: 2026,
    rating: '★ 8.9',
    rentPrice: 189,
    buyPrice: 449,
    poster: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    tag: '4K Ultra HD',
  },
];

// Persistent in-memory event booking store
const EVENT_BOOKINGS = [];

function validateOffer(code, ticketCount, ticketTotal) {
  if (!code) return { valid: false, message: 'No offer code provided' };
  const offer = OFFERS.find((o) => o.code.toUpperCase() === code.trim().toUpperCase());
  if (!offer) return { valid: false, message: 'Invalid promo code. Please check and try again.' };

  if (offer.minTickets && ticketCount < offer.minTickets) {
    return { valid: false, message: `Offer requires at least ${offer.minTickets} tickets.` };
  }
  if (offer.minAmount && ticketTotal < offer.minAmount) {
    return { valid: false, message: `Minimum booking total of ₹${offer.minAmount} required for this offer.` };
  }

  let discount = 0;
  if (offer.discountType === 'FLAT') {
    discount = offer.discountValue;
  } else if (offer.discountType === 'PERCENT') {
    discount = Math.min(Math.round((ticketTotal * offer.discountValue) / 100), offer.maxDiscount || 9999);
  } else if (offer.discountType === 'BOGO') {
    const singleTicket = Math.round(ticketTotal / ticketCount);
    discount = Math.min(singleTicket, offer.maxDiscount || 250);
  }

  return {
    valid: true,
    code: offer.code,
    title: offer.title,
    discount: Math.min(discount, ticketTotal),
    message: `Offer applied! Saved ₹${discount}`,
  };
}

async function bookEventTicket({ eventId, showId, tierName, ticketCount = 1, attendee, promoCode, user }) {
  const event = EVENTS.find((e) => e.id === eventId);
  if (!event) throw new Error('Event not found');

  const show = event.shows?.find((s) => s.id === showId) || event.shows?.[0] || {
    id: 'default',
    dateLabel: new Date(event.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }),
    time: new Date(event.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    title: 'Standard Showcase',
  };

  const tier = event.tiers?.find((t) => t.name === tierName) || event.tiers?.[0] || {
    name: 'General Admission',
    price: event.priceFrom,
    perks: 'Standard entry pass',
  };

  const count = Math.max(1, Math.min(10, Number(ticketCount)));
  const baseTotal = tier.price * count;
  const convenienceFee = Math.round(count * 35 * 1.18);

  let discount = 0;
  let appliedCode = null;
  if (promoCode) {
    const offerRes = validateOffer(promoCode, count, baseTotal);
    if (offerRes.valid) {
      discount = offerRes.discount;
      appliedCode = offerRes.code;
    }
  }

  const grandTotal = Math.max(0, baseTotal + convenienceFee - discount);
  const reference = `EVT-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Generate QR Code payload
  const qrPayload = JSON.stringify({
    type: 'BMS_EVENT_PASS',
    ref: reference,
    event: event.title,
    venue: event.venue,
    city: event.city,
    time: `${show.dateLabel} · ${show.time}`,
    tier: tier.name,
    tickets: count,
    attendee: attendee?.name || user?.name || 'Guest Pass',
    verified: true,
  });

  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    width: 260,
    margin: 2,
    color: { dark: '#111827', light: '#ffffff' },
  }).catch(() => '');

  const booking = {
    id: `bk-${Date.now()}`,
    reference,
    eventId: event.id,
    eventTitle: event.title,
    eventType: event.type,
    category: event.category,
    venue: event.venue,
    city: event.city,
    poster: event.poster,
    showTime: `${show.dateLabel} · ${show.time}`,
    showTitle: show.title,
    tier: tier.name,
    tierPerks: tier.perks,
    unitPrice: tier.price,
    ticketCount: count,
    baseTotal,
    convenienceFee,
    discount,
    grandTotal,
    promoCode: appliedCode,
    attendee: {
      name: attendee?.name || user?.name || 'Valued Guest',
      phone: attendee?.phone || '+91 98765 43210',
      email: attendee?.email || user?.email || 'guest@clickshow.test',
    },
    qrCode: qrDataUrl,
    bookedAt: new Date().toISOString(),
    status: 'CONFIRMED',
    userId: user?.id || 'guest',
  };

  EVENT_BOOKINGS.unshift(booking);
  return booking;
}

function getEventBookings(userId) {
  if (!userId || userId === 'all') return EVENT_BOOKINGS;
  return EVENT_BOOKINGS.filter((b) => b.userId === userId || b.userId === 'guest');
}

module.exports = {
  OFFERS,
  FNB_ITEMS,
  EVENTS,
  STREAMS,
  validateOffer,
  bookEventTicket,
  getEventBookings,
};
