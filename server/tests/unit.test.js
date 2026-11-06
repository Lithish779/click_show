const { buildLayout, seatCategoryMap, capacityOf } = require('../src/utils/layout');
const { priceSeats, refundFor } = require('../src/utils/pricing');
const { charge } = require('../src/services/payment');

describe('layout', () => {
  const layout = buildLayout([{ category: 'STANDARD', rows: 2, seatsPerRow: 4 }, { category: 'RECLINER', rows: 1, seatsPerRow: 2 }]);
  test('rows are lettered in order and capacity is summed', () => {
    expect(layout.map((r) => r.row)).toEqual(['A', 'B', 'C']);
    expect(capacityOf(layout)).toBe(10);
  });
  test('seat ids map to categories', () => {
    const m = seatCategoryMap(layout);
    expect(m.get('B4')).toBe('STANDARD');
    expect(m.get('C2')).toBe('RECLINER');
    expect(m.has('C3')).toBe(false);
  });
  test('more than 26 rows is rejected', () => {
    expect(() => buildLayout([{ category: 'STANDARD', rows: 30, seatsPerRow: 1 }])).toThrow();
  });
});

describe('pricing', () => {
  test('totals seats by category price', () => {
    const m = new Map([['A1', 'STANDARD'], ['B1', 'PREMIUM']]);
    expect(priceSeats(m, { STANDARD: 200, PREMIUM: 300 }, ['A1', 'B1']).total).toBe(500);
  });
});

describe('refund policy', () => {
  const at = (mins) => new Date(Date.now() + mins * 60000);
  test('full refund well before the show', () => expect(refundFor({ startsAt: at(600), total: 400 })).toMatchObject({ allowed: true, percent: 100, amount: 400 }));
  test('partial refund inside the full-refund window', () => expect(refundFor({ startsAt: at(120), total: 400 })).toMatchObject({ allowed: true, percent: 50, amount: 200 }));
  test('closed inside the cutoff', () => expect(refundFor({ startsAt: at(30), total: 400 }).allowed).toBe(false));
  test('admin may override the cutoff', () => expect(refundFor({ startsAt: at(5), total: 400, isAdmin: true }).amount).toBe(400));
});

describe('simulated payment', () => {
  test('approves normal cards and keeps only last4', () => expect(charge({ cardNumber: '4242 4242 4242 4242', amount: 1 })).toMatchObject({ ok: true, last4: '4242' }));
  test('declines cards ending 0002', () => expect(charge({ cardNumber: '4000000000000002', amount: 1 }).ok).toBe(false));
});
