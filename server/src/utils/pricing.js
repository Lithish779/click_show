const cfg = require('../config');

/** Price the given seats from the show's category price list. Pure function. */
function priceSeats(categoryMap, prices, seatIds) {
  const seats = seatIds.map((seatId) => {
    const category = categoryMap.get(seatId);
    return { seatId, category, price: prices[category] };
  });
  return { seats, total: seats.reduce((s, x) => s + x.price, 0) };
}

/**
 * Cancellation policy (configurable via env):
 *  - closed within CANCEL_CUTOFF_MINUTES of showtime (admins may override)
 *  - 100% refund if cancelled >= FULL_REFUND_BEFORE_MINUTES before the show
 *  - otherwise PARTIAL_REFUND_PERCENT %
 */
function refundFor({ startsAt, total, now = new Date(), isAdmin = false }) {
  const minutesLeft = (new Date(startsAt).getTime() - now.getTime()) / 60000;
  if (isAdmin) return { allowed: true, percent: 100, amount: total };
  if (minutesLeft < cfg.cancelCutoffMinutes) return { allowed: false, percent: 0, amount: 0 };
  const percent = minutesLeft >= cfg.fullRefundBeforeMinutes ? 100 : cfg.partialRefundPercent;
  return { allowed: true, percent, amount: Math.floor((total * percent) / 100) };
}

module.exports = { priceSeats, refundFor };
