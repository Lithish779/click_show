const crypto = require('crypto');

/**
 * SIMULATED payment gateway. No real money, no real card processing; card numbers are never stored (only last 4).
 * Test cards: any number ending in 0002 is declined; everything else succeeds.
 */
function charge({ cardNumber, amount }) {
  const digits = cardNumber.replace(/[\s-]/g, '');
  if (digits.endsWith('0002')) return { ok: false, reason: 'CARD_DECLINED' };
  return { ok: true, txnId: `SIM-${crypto.randomUUID()}`, last4: digits.slice(-4), amount };
}

module.exports = { charge };
