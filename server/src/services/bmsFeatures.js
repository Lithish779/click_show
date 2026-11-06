const OFFERS = [
  {
    code: 'BMS50',
    title: 'Flat ₹50 Off on Movie Tickets',
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
    description: 'Buy one ticket and get the second ticket free (up to ₹250 discount) with Axis Bank Select / Magnus cards.',
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
    description: 'Freshly popped warm golden corn tossed with generous melting melted butter.',
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
    description: 'Golden fried vegetable patty topped with melted cheese, crisp lettuce and seasoned peri-peri fries.',
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
    description: 'Chilled bubbly carbonated soft drink to accompany your movie snacks.',
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
    type: 'Music Festival',
    language: 'Hindi',
    city: 'Mumbai',
    venue: 'Jio World Garden, BKC',
    date: '2026-11-20T19:00:00Z',
    priceFrom: 1499,
    rating: '★ 9.4',
    poster: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    tags: ['Live Band', 'Grand Arena', 'Trending'],
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
    rating: '★ 9.6',
    poster: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=600&auto=format&fit=crop&q=80',
    tags: ['Comedy', 'Superhit', 'Filling Fast'],
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
    rating: '★ 9.8',
    poster: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=600&auto=format&fit=crop&q=80',
    tags: ['Big Screen 4K', 'Stadium Sound', 'Mega Hit'],
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
    rating: '★ 9.5',
    poster: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=600&auto=format&fit=crop&q=80',
    tags: ['Broadway Style', 'Costumes by Manish Malhotra'],
  },
  {
    id: 'evt-5',
    title: 'Sunburn Arena ft. Martin Garrix',
    category: 'Events',
    type: 'EDM Concert',
    language: 'English',
    city: 'Hyderabad',
    venue: 'GMR Arena, Shamshabad',
    date: '2026-11-28T16:00:00Z',
    priceFrom: 1800,
    rating: '★ 9.2',
    poster: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=600&auto=format&fit=crop&q=80',
    tags: ['EDM', 'Laser Show', 'Youth Choice'],
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
    rating: '★ 9.1',
    poster: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&auto=format&fit=crop&q=80',
    tags: ['Cheer Squad', 'Food Trucks', 'Jalandhar Special'],
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
    // Single ticket price discount up to maxDiscount
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

module.exports = {
  OFFERS,
  FNB_ITEMS,
  EVENTS,
  STREAMS,
  validateOffer,
};
