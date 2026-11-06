import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, fmtDateTime, money } from '../api.js';
import { useLoad } from '../hooks.js';
import { ErrorBox, Loading, Notice } from '../components.jsx';

const MAX_SEATS = 6;

const VEHICLES = [
  { count: 1, name: 'Cycle', icon: '🚲' },
  { count: 2, name: 'Scooter', icon: '🛵' },
  { count: 3, name: 'Auto', icon: '🛺' },
  { count: 4, name: 'Mini', icon: '🚗' },
  { count: 5, name: 'Sedan', icon: '🚙' },
  { count: 6, name: 'Van', icon: '🚌' },
];

function useCountdown(expiresAt) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  return expiresAt ? Math.max(0, Math.floor((new Date(expiresAt) - now) / 1000)) : null;
}

export default function SeatSelection() {
  const { id } = useParams();
  const show = useLoad(() => api(`/shows/${id}`), [id]);
  const map = useLoad(() => api(`/shows/${id}/seats`), [id]);
  const fnbCatalog = useLoad(() => api('/bms/fnb'), []);

  const [targetCount, setTargetCount] = useState(2);
  const [showVehicleModal, setShowVehicleModal] = useState(true);

  const [selected, setSelected] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // F&B Addon State: { [itemId]: quantity }
  const [showFnbStep, setShowFnbStep] = useState(false);
  const [fnbCart, setFnbCart] = useState({});

  // Offers & Promo state
  const [promoCode, setPromoCode] = useState('');
  const [appliedOffer, setAppliedOffer] = useState(null);
  const [promoError, setPromoError] = useState('');

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' | 'upi'
  const [card, setCard] = useState({ cardNumber: '4242 4242 4242 4242', name: 'Demo Customer' });
  const [upiId, setUpiId] = useState('customer@okaxis');
  const [ticket, setTicket] = useState(null);

  const hold = map.data?.myHold;
  const secondsLeft = useCountdown(hold?.expiresAt);
  const idemKey = useMemo(() => crypto.randomUUID(), [hold?.holdId]);

  useEffect(() => {
    const t = setInterval(() => !document.hidden && map.reload(), 10000);
    return () => clearInterval(t);
  }, [map.reload]);

  useEffect(() => {
    if (secondsLeft === 0) {
      map.reload();
      setError({ message: 'Your seat hold expired. Please choose your seats again.' });
      setShowFnbStep(false);
    }
  }, [secondsLeft]); // eslint-disable-line

  const seats = useMemo(() => map.data?.rows.flatMap((r) => r.seats.map((s) => ({ ...s, category: r.category }))) ?? [], [map.data]);
  const mine = seats.filter((s) => s.status === 'mine');
  const ticketBaseTotal = (hold ? mine : seats.filter((s) => selected.includes(s.seatId))).reduce((a, s) => a + s.price, 0);

  // Calculate convenience fee (~₹30 per ticket + 18% GST)
  const ticketCount = hold ? mine.length : selected.length;
  const convenienceFee = ticketCount ? Math.round(ticketCount * 30 * 1.18) : 0;

  // F&B Total
  const fnbTotal = useMemo(() => {
    if (!fnbCatalog.data?.items) return 0;
    return Object.entries(fnbCart).reduce((sum, [itemId, qty]) => {
      const item = fnbCatalog.data.items.find((i) => i.id === itemId);
      return sum + (item ? item.price * qty : 0);
    }, 0);
  }, [fnbCart, fnbCatalog.data]);

  const discountAmount = appliedOffer ? appliedOffer.discount : 0;
  const grandTotal = Math.max(0, ticketBaseTotal + convenienceFee + fnbTotal - discountAmount);

  if (ticket) return <BmsTicket booking={ticket} fnbCart={fnbCart} fnbItems={fnbCatalog.data?.items} grandTotal={grandTotal} />;
  if (map.loading && !map.data) return <Loading label="Loading seat layout…" />;
  if (map.error && !map.data) return <ErrorBox error={map.error} />;
  const s = show.data;

  const toggle = (seat) => {
    if (hold || ['booked', 'held'].includes(seat.status)) return;
    setError(null);
    setSelected((cur) => (cur.includes(seat.seatId) ? cur.filter((x) => x !== seat.seatId) : cur.length < MAX_SEATS ? [...cur, seat.seatId] : cur));
  };

  async function act(fn) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e);
      if (e.status === 409) {
        setSelected([]);
        map.reload();
      }
    } finally {
      setBusy(false);
    }
  }

  const holdSeats = () =>
    act(async () => {
      await api(`/shows/${id}/holds`, { method: 'POST', body: { seatIds: selected } });
      setSelected([]);
      await map.reload();
      setShowFnbStep(true); // Proceed to F&B and Checkout
    });

  const release = () =>
    act(async () => {
      await api(`/shows/${id}/holds`, { method: 'DELETE' });
      setShowFnbStep(false);
      setAppliedOffer(null);
      await map.reload();
    });

  const handleApplyOffer = async (e) => {
    e.preventDefault();
    setPromoError('');
    if (!promoCode.trim()) return;
    try {
      const res = await api('/bms/offers/validate', {
        method: 'POST',
        body: { code: promoCode, ticketCount: mine.length, ticketTotal: ticketBaseTotal },
      });
      if (res.valid) {
        setAppliedOffer(res);
      } else {
        setPromoError(res.message);
      }
    } catch (err) {
      setPromoError('Failed to validate promo code.');
    }
  };

  const handleFnbChange = (itemId, delta) => {
    setFnbCart((prev) => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const pay = (e) => {
    e.preventDefault();
    act(async () => {
      const booking = await api('/bookings', {
        method: 'POST',
        headers: { 'Idempotency-Key': idemKey },
        body: {
          showId: id,
          holdId: hold.holdId,
          payment: {
            ...card,
            method: paymentMethod === 'upi' ? `UPI:${upiId}` : 'CARD',
          },
        },
      });
      setTicket(booking);
    });
  };

  const mm = secondsLeft != null ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}` : '';

  return (
    <div className="bms-seat-page">
      {/* Show & Movie Header Bar */}
      <div className="seat-show-header">
        <div className="header-left">
          <Link to={`/movies/${s?.movie?._id || ''}`} className="btn-back-movie">‹ Back</Link>
          <div>
            <h1 className="seat-movie-title">{map.data.movie}</h1>
            {s && (
              <p className="seat-movie-meta">
                {s.screen.theatre.name}, {s.screen.theatre.city} · {s.screen.name} · {fmtDateTime(s.startsAt)} · <span className="format-tag">{s.format}</span>
              </p>
            )}
          </div>
        </div>

        {/* Selected quantity badge */}
        <button
          type="button"
          className="bms-btn-edit-qty"
          onClick={() => setShowVehicleModal(true)}
        >
          <span>{targetCount} Tickets</span>
          <span className="btn-pencil">✏️</span>
        </button>
      </div>

      {/* Main Seat Layout Area */}
      <div className="seatmap-wrapper">
        <div className="screen-indicator-box">
          <div className="bms-screen-curve" aria-hidden="true"></div>
          <p className="screen-subtext">All eyes this way please!</p>
        </div>

        <div className="bms-seatmap" role="group" aria-label="Seat layout">
          {map.data.rows.map((r) => (
            <div className="bms-seat-row" key={r.row}>
              <span className="row-code" aria-hidden="true">{r.row}</span>
              <div className="row-seats">
                {r.seats.map((seat) => {
                  const isSel = selected.includes(seat.seatId);
                  const cls = seat.status === 'mine' ? 'mine' : isSel ? 'selected' : seat.status;
                  return (
                    <button
                      key={seat.seatId}
                      type="button"
                      className={`bms-seat ${cls} cat-${r.category.toLowerCase()}`}
                      onClick={() => toggle(seat)}
                      disabled={['booked', 'held'].includes(seat.status)}
                      aria-pressed={isSel || seat.status === 'mine'}
                      title={`${seat.seatId} · ${r.category} · ${money(seat.price)}`}
                    >
                      {seat.seatId.slice(1)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <ul className="bms-seat-legend" aria-label="Seat status legend">
          <li><span className="legend-box available" /> Available</li>
          <li><span className="legend-box selected" /> Selected</li>
          <li><span className="legend-box mine" /> Held by you</li>
          <li><span className="legend-box booked" /> Sold out</li>
        </ul>

        {/* Pricing Tiers */}
        <div className="bms-pricing-tiers">
          {Object.entries(map.data.prices).map(([cat, pr]) => (
            <span key={cat} className="tier-badge">
              <strong>{cat}</strong>: {money(pr)}
            </span>
          ))}
        </div>
      </div>

      {/* Floating Bottom Action Bar */}
      {!hold && (
        <div className="bms-sticky-bottom-bar">
          <div className="bottom-bar-inner">
            <div className="bottom-left">
              {selected.length === 0 ? (
                <span className="no-seats-text">Please select your preferred seats on the map</span>
              ) : (
                <div>
                  <span className="seats-selected-list">Seats: <strong>{selected.join(', ')}</strong></span>
                  <span className="seats-price-total">Subtotal: <strong>{money(ticketBaseTotal)}</strong></span>
                </div>
              )}
            </div>

            <button
              type="button"
              className="bms-btn-proceed-pay"
              disabled={selected.length === 0 || busy}
              onClick={holdSeats}
            >
              {busy ? 'Holding Seats…' : `Continue with ${selected.length || 0} Seats`}
            </button>
          </div>
        </div>
      )}

      {/* ===== F&B AND CHECKOUT DRAWER / MODAL ===== */}
      {hold && (
        <div className="bms-checkout-overlay">
          <div className="bms-checkout-panel">
            <div className="checkout-header-row">
              <div>
                <h2>Booking Summary & Checkout</h2>
                <span className="seats-held-sub">Seats: {mine.map((m) => m.seatId).join(', ')} ({s?.screen.name})</span>
              </div>
              <div className="checkout-timer-box">
                <span className="timer-label">Hold expires in:</span>
                <span className={`timer-digits ${secondsLeft < 60 ? 'urgent' : ''}`}>{mm}</span>
              </div>
            </div>

            <div className="checkout-body-grid">
              {/* Left Column: F&B Snacks Section */}
              <div className="checkout-fnb-section">
                <div className="fnb-section-head">
                  <h3>🍿 Grab a Bite! (Pre-book & Skip Lines)</h3>
                  <span className="fnb-head-sub">Delivered to your seat or quick-pickup at counter</span>
                </div>

                <div className="fnb-items-list">
                  {fnbCatalog.data?.items?.map((item) => {
                    const qty = fnbCart[item.id] || 0;
                    return (
                      <div key={item.id} className="fnb-item-card">
                        <img src={item.image} alt={item.name} className="fnb-item-img" />
                        <div className="fnb-item-details">
                          <div className="fnb-item-top">
                            <span className={`veg-dot ${item.veg ? 'veg' : 'non-veg'}`}>●</span>
                            <strong className="fnb-item-name">{item.name}</strong>
                          </div>
                          <p className="fnb-item-desc">{item.description}</p>
                          <span className="fnb-item-price">{money(item.price)}</span>
                        </div>

                        <div className="fnb-counter-ctrl">
                          {qty === 0 ? (
                            <button
                              type="button"
                              className="btn-add-fnb"
                              onClick={() => handleFnbChange(item.id, 1)}
                            >
                              Add
                            </button>
                          ) : (
                            <div className="qty-stepper">
                              <button type="button" onClick={() => handleFnbChange(item.id, -1)}>-</button>
                              <span>{qty}</span>
                              <button type="button" onClick={() => handleFnbChange(item.id, 1)}>+</button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Order Summary & Payment */}
              <div className="checkout-payment-section">
                <h3>Order Summary</h3>
                <div className="order-summary-box">
                  <div className="summary-line">
                    <span>Ticket Subtotal ({mine.length} seats)</span>
                    <strong>{money(ticketBaseTotal)}</strong>
                  </div>
                  <div className="summary-line">
                    <span>Convenience Fee (incl. 18% GST)</span>
                    <span>{money(convenienceFee)}</span>
                  </div>
                  {fnbTotal > 0 && (
                    <div className="summary-line">
                      <span>Food & Snacks ({Object.values(fnbCart).reduce((a, b) => a + b, 0)} items)</span>
                      <span>{money(fnbTotal)}</span>
                    </div>
                  )}
                  {appliedOffer && (
                    <div className="summary-line discount">
                      <span>Offer ({appliedOffer.code})</span>
                      <strong>-{money(appliedOffer.discount)}</strong>
                    </div>
                  )}
                  <div className="summary-total-line">
                    <span>Amount Payable</span>
                    <strong className="final-total">{money(grandTotal)}</strong>
                  </div>
                </div>

                {/* Promo Code Input */}
                <form className="promo-code-form" onSubmit={handleApplyOffer}>
                  <input
                    type="text"
                    placeholder="Enter coupon code (e.g. BMS50, BOGO)"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="promo-input"
                  />
                  <button type="submit" className="btn-apply-promo">
                    Apply
                  </button>
                </form>
                {promoError && <p className="promo-error">{promoError}</p>}
                {appliedOffer && <p className="promo-success">✓ {appliedOffer.message}</p>}

                {/* Payment Methods */}
                <div className="payment-options-block">
                  <span className="pay-methods-title">Select Payment Mode:</span>
                  <div className="pay-tab-row">
                    <button
                      type="button"
                      className={`pay-tab-btn ${paymentMethod === 'card' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('card')}
                    >
                      💳 Card
                    </button>
                    <button
                      type="button"
                      className={`pay-tab-btn ${paymentMethod === 'upi' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('upi')}
                    >
                      📱 UPI (GPay / PhonePe)
                    </button>
                  </div>

                  {paymentMethod === 'card' ? (
                    <div className="card-fields">
                      <label>
                        Name on Card
                        <input
                          type="text"
                          value={card.name}
                          onChange={(e) => setCard({ ...card, name: e.target.value })}
                          required
                        />
                      </label>
                      <label>
                        Card Number
                        <input
                          type="text"
                          value={card.cardNumber}
                          onChange={(e) => setCard({ ...card, cardNumber: e.target.value })}
                          required
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="upi-fields">
                      <label>
                        UPI ID (VPA)
                        <input
                          type="text"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          placeholder="yourname@okaxis / okicici"
                          required
                        />
                      </label>
                    </div>
                  )}
                </div>

                <div className="checkout-action-btns">
                  <button
                    type="button"
                    className="btn-release-seats"
                    disabled={busy}
                    onClick={release}
                  >
                    Cancel & Release
                  </button>
                  <button
                    type="button"
                    className="btn-final-pay"
                    disabled={busy}
                    onClick={pay}
                  >
                    {busy ? 'Processing Payment…' : `Pay ${money(grandTotal)}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== ICONIC HOW MANY SEATS VEHICLE MODAL ===== */}
      {showVehicleModal && !hold && (
        <div className="vehicle-modal-overlay" onClick={() => setShowVehicleModal(false)}>
          <div className="vehicle-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setShowVehicleModal(false)}
            >
              ✕
            </button>
            <h3 className="vehicle-title">How Many Seats?</h3>
            <p className="vehicle-sub">Choose your party size</p>

            <div className="vehicle-options-grid">
              {VEHICLES.map((v) => (
                <button
                  key={v.count}
                  type="button"
                  className={`vehicle-btn ${targetCount === v.count ? 'active' : ''}`}
                  onClick={() => {
                    setTargetCount(v.count);
                    setShowVehicleModal(false);
                  }}
                >
                  <span className="vehicle-icon">{v.icon}</span>
                  <strong className="vehicle-num">{v.count}</strong>
                  <span className="vehicle-name">{v.name}</span>
                </button>
              ))}
            </div>

            <div className="vehicle-pricing-preview">
              <span className="prev-head">Categories Available:</span>
              <div className="cat-list-row">
                <span>Standard (₹200)</span> · <span>Premium (₹320)</span> · <span>Recliner (₹500)</span>
              </div>
            </div>

            <button
              type="button"
              className="btn-vehicle-select"
              onClick={() => setShowVehicleModal(false)}
            >
              Select Seats
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Iconic BookMyShow M-Ticket Component
function BmsTicket({ booking, fnbCart, fnbItems, grandTotal }) {
  const qr = useLoad(() => api(`/bookings/${booking._id}/qr`), [booking._id]);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(`My Movie Ticket for ${booking.show?.movie?.title || 'ClickShow'}: Reference ${booking.reference}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="bms-ticket-page">
      <div className="bms-m-ticket-card">
        {/* Ticket Top Perforation Banner */}
        <div className="m-ticket-header">
          <div className="ticket-brand-row">
            <span className="bms-tag-mticket">📱 M-TICKET CONFIRMED</span>
            <span className="ticket-ref-code">{booking.reference}</span>
          </div>
          <h2 className="ticket-movie-title">{booking.show?.movie?.title || 'Cinema Ticket'}</h2>
          <p className="ticket-cinema-meta">
            {booking.show?.screen?.theatre?.name || 'CineBook Screen'}, {booking.show?.screen?.theatre?.city || ''}
          </p>
        </div>

        {/* Perforated Divider */}
        <div className="ticket-perforation">
          <span className="punch left"></span>
          <span className="perforated-line"></span>
          <span className="punch right"></span>
        </div>

        {/* Ticket Details Body */}
        <div className="m-ticket-body">
          <div className="ticket-grid-info">
            <div className="grid-info-item">
              <span className="info-label">SCREEN</span>
              <strong className="info-val">{booking.show?.screen?.name || 'Screen 1'}</strong>
            </div>
            <div className="grid-info-item">
              <span className="info-label">DATE & TIME</span>
              <strong className="info-val">{fmtDateTime(booking.show?.startsAt || new Date())}</strong>
            </div>
            <div className="grid-info-item">
              <span className="info-label">SEATS ({booking.seats.length})</span>
              <strong className="info-val highlight">{booking.seats.map((s) => s.seatId).join(', ')}</strong>
            </div>
            <div className="grid-info-item">
              <span className="info-label">TOTAL PAID</span>
              <strong className="info-val">{money(booking.total || grandTotal)}</strong>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="m-ticket-qr-container">
            {qr.loading ? (
              <Loading label="Generating entry QR Code…" />
            ) : qr.data ? (
              <img
                src={qr.data.qr}
                alt={`QR code for ticket ${booking.reference}`}
                className="ticket-qr-image"
                width="160"
                height="160"
              />
            ) : null}
            <span className="qr-scan-instruction">Show this QR code at cinema turnstile for entry</span>
          </div>

          {/* Action buttons */}
          <div className="ticket-action-row">
            <button type="button" className="btn-share-ticket" onClick={handleShare}>
              {copiedLink ? '✓ Copied Details!' : '📤 Share Ticket'}
            </button>
            <Link to="/bookings" className="btn-view-bookings-bms">
              View All Bookings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
