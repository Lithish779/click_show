import { useState, useEffect } from 'react';
import { api, money } from '../api';
import { Loading } from '../components';

export default function EventsPage({ defaultCategory = 'Events', pageTitle = 'Live Events & Shows' }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(defaultCategory);

  // Booking Flow States
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedShow, setSelectedShow] = useState(null);
  const [selectedTier, setSelectedTier] = useState(null);
  const [ticketCount, setTicketCount] = useState(2);
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeePhone, setAttendeePhone] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoMsg, setPromoMsg] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [savedPasses, setSavedPasses] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('bms_event_passes') || '[]');
    } catch {
      return [];
    }
  });
  const [viewingPass, setViewingPass] = useState(null);

  useEffect(() => {
    setActiveTab(defaultCategory);
  }, [defaultCategory]);

  useEffect(() => {
    setLoading(true);
    const query = activeTab === 'All' ? {} : { category: activeTab };
    api('/bms/events', { query })
      .then((data) => {
        setEvents(data?.events || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activeTab]);

  const handleOpenBooking = (evt) => {
    setSelectedEvent(evt);
    setSelectedShow(evt.shows?.[0] || null);
    setSelectedTier(evt.tiers?.[0] || null);
    setTicketCount(2);
    setPromoCode('');
    setPromoDiscount(0);
    setPromoMsg('');
    setConfirmedBooking(null);
  };

  const handleApplyPromo = async (e) => {
    e.preventDefault();
    if (!promoCode.trim()) return;
    try {
      const baseTotal = (selectedTier?.price || selectedEvent?.priceFrom || 500) * ticketCount;
      const res = await api('/bms/offers/validate', {
        method: 'POST',
        body: { code: promoCode.trim(), ticketCount, ticketTotal: baseTotal },
      });
      if (res.valid) {
        setPromoDiscount(res.discount);
        setPromoMsg(`✅ Offer Applied! You saved ${money(res.discount)}.`);
      } else {
        setPromoDiscount(0);
        setPromoMsg(`❌ ${res.message}`);
      }
    } catch (err) {
      setPromoDiscount(0);
      setPromoMsg(`❌ ${err.message || 'Failed to validate offer'}`);
    }
  };

  const handleConfirmEventBooking = async () => {
    if (!selectedEvent) return;
    setBookingLoading(true);
    try {
      const body = {
        eventId: selectedEvent.id,
        showId: selectedShow?.id,
        tierName: selectedTier?.name,
        ticketCount,
        promoCode: promoDiscount > 0 ? promoCode : undefined,
        attendee: {
          name: attendeeName.trim() || 'Valued Guest',
          phone: attendeePhone.trim() || '+91 98765 43210',
        },
      };

      const res = await api('/bms/events/book', { method: 'POST', body });
      const booking = res.booking;
      setConfirmedBooking(booking);

      // Persist in localStorage
      const updated = [booking, ...savedPasses];
      setSavedPasses(updated);
      localStorage.setItem('bms_event_passes', JSON.stringify(updated));
    } catch (err) {
      alert(`Booking error: ${err.message || 'Could not release tickets'}`);
    } finally {
      setBookingLoading(false);
    }
  };

  const tierPrice = selectedTier?.price || selectedEvent?.priceFrom || 500;
  const baseTotal = tierPrice * ticketCount;
  const convenienceFee = Math.round(ticketCount * 35 * 1.18);
  const grandTotal = Math.max(0, baseTotal + convenienceFee - promoDiscount);

  return (
    <div className="bms-page-container">
      {/* Header */}
      <div className="bms-page-header">
        <span className="bms-page-badge">Live Experiences & Shows</span>
        <h1 className="bms-page-title">{pageTitle}</h1>
        <p className="bms-page-desc">
          Discover music concerts, stand-up comedy specials, cricket fan parks, and world-class theatrical plays with instant ticket release.
        </p>

        {/* Categories Bar */}
        <div className="events-category-bar">
          {['Events', 'Plays', 'Sports', 'All'].map((cat) => (
            <button
              key={cat}
              type="button"
              className={`event-cat-btn ${activeTab === cat ? 'active' : ''}`}
              onClick={() => setActiveTab(cat)}
            >
              {cat === 'Events' && '🎤 '}
              {cat === 'Plays' && '🎭 '}
              {cat === 'Sports' && '🏏 '}
              {cat === 'All' && '🌟 '}
              {cat}
            </button>
          ))}
          {savedPasses.length > 0 && (
            <button
              type="button"
              className="event-cat-btn my-passes-btn"
              onClick={() => setViewingPass(savedPasses[0])}
            >
              🎟️ My Event Passes ({savedPasses.length})
            </button>
          )}
        </div>
      </div>

      {loading && <Loading label="Loading live experiences..." />}

      {/* Events Grid */}
      <div className="events-grid">
        {events.map((evt) => (
          <div key={evt.id} className="event-card">
            <div className="event-poster-wrap">
              <img src={evt.poster} alt={evt.title} className="event-poster-img" loading="lazy" />
              <div className="event-badge-row">
                <span className="event-rating">{evt.rating}</span>
                <span className="event-type">{evt.type}</span>
              </div>
            </div>

            <div className="event-body">
              <h3 className="event-title">{evt.title}</h3>
              <p className="event-venue">📍 {evt.venue}, {evt.city}</p>
              <p className="event-date">
                📅 {evt.shows?.[0] ? `${evt.shows[0].dateLabel} · ${evt.shows[0].time}` : new Date(evt.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>

              <div className="event-tags-row">
                {evt.tags?.map((t) => (
                  <span key={t} className="event-tag">{t}</span>
                ))}
              </div>

              {/* Show availability info */}
              <div className="event-shows-summary">
                <span className="shows-count-tag">
                  ⚡ {evt.shows?.length || 3} Scheduled Shows Available
                </span>
              </div>

              <div className="event-footer">
                <div>
                  <span className="event-price-label">Tickets from</span>
                  <strong className="event-price">{money(evt.priceFrom)}</strong>
                </div>
                <button
                  type="button"
                  className="btn-book-event"
                  onClick={() => handleOpenBooking(evt)}
                >
                  Book Tickets →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* =====================================================================
          INTERACTIVE EVENT TICKET BOOKING & RELEASE MODAL
          ===================================================================== */}
      {selectedEvent && !confirmedBooking && (
        <div className="event-modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="event-modal-card event-booking-dialog" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedEvent(null)}>✕</button>

            <div className="event-dialog-header">
              <span className="dialog-badge">RELEASE EVENT TICKETS</span>
              <h2 className="dialog-title">{selectedEvent.title}</h2>
              <p className="dialog-venue">📍 {selectedEvent.venue}, {selectedEvent.city}</p>
            </div>

            <div className="event-booking-scrollable">
              {/* 1. SELECT SHOW / TIME */}
              <div className="booking-section-group">
                <label className="section-group-label">1. Select Show Date & Time</label>
                <div className="event-shows-grid">
                  {(selectedEvent.shows || [
                    { id: 's1', dateLabel: 'Fri, 20 Nov', time: '07:00 PM', title: 'Opening Gala Show', available: 120 },
                    { id: 's2', dateLabel: 'Sat, 21 Nov', time: '08:00 PM', title: 'Grand Weekend Special', available: 85 },
                    { id: 's3', dateLabel: 'Sun, 22 Nov', time: '06:30 PM', title: 'Finale Session', available: 45 },
                  ]).map((sh) => (
                    <button
                      key={sh.id}
                      type="button"
                      className={`event-show-pill ${selectedShow?.id === sh.id ? 'active' : ''}`}
                      onClick={() => setSelectedShow(sh)}
                    >
                      <span className="sh-date">{sh.dateLabel}</span>
                      <strong className="sh-time">{sh.time}</strong>
                      <span className="sh-title">{sh.title}</span>
                      <span className="sh-avail">{sh.available} tickets left</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. SELECT TICKET TIER */}
              <div className="booking-section-group">
                <label className="section-group-label">2. Select Pass Category & Seat Zone</label>
                <div className="event-tiers-list">
                  {(selectedEvent.tiers || [
                    { name: 'VIP Lounge Pass', price: 2999, perks: 'Front stage lounge, complimentary beverage, fast-track entry' },
                    { name: 'Fan Pit (Stage Front)', price: 1999, perks: 'Closest to stage, high energy zone, lanyard' },
                    { name: 'Gold Reserved Seating', price: 1499, perks: 'Elevated seating, crystal clear sightline' },
                    { name: 'Silver General Admission', price: 999, perks: 'Standard arena admission pass' },
                  ]).map((t) => (
                    <div
                      key={t.name}
                      className={`event-tier-card ${selectedTier?.name === t.name ? 'active' : ''}`}
                      onClick={() => setSelectedTier(t)}
                    >
                      <div className="tier-radio-col">
                        <span className={`custom-radio ${selectedTier?.name === t.name ? 'checked' : ''}`} />
                      </div>
                      <div className="tier-details-col">
                        <div className="tier-name-row">
                          <strong className="tier-title">{t.name}</strong>
                          <span className="tier-price-tag">{money(t.price)}</span>
                        </div>
                        <p className="tier-perks">{t.perks}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. TICKET QUANTITY */}
              <div className="booking-section-group">
                <label className="section-group-label">3. Select Number of Tickets</label>
                <div className="ticket-quantity-row">
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      className={`btn-qty-box ${ticketCount === num ? 'active' : ''}`}
                      onClick={() => setTicketCount(num)}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. ATTENDEE DETAILS */}
              <div className="booking-section-group">
                <label className="section-group-label">4. Primary Attendee Info</label>
                <div className="attendee-inputs-grid">
                  <input
                    type="text"
                    placeholder="Full Name (for M-Ticket pass)"
                    className="attendee-input"
                    value={attendeeName}
                    onChange={(e) => setAttendeeName(e.target.value)}
                  />
                  <input
                    type="tel"
                    placeholder="Mobile Number (SMS verification)"
                    className="attendee-input"
                    value={attendeePhone}
                    onChange={(e) => setAttendeePhone(e.target.value)}
                  />
                </div>
              </div>

              {/* 5. PROMO COUPON CODE */}
              <div className="booking-section-group">
                <label className="section-group-label">5. Apply Discount Offer</label>
                <form className="promo-form-row" onSubmit={handleApplyPromo}>
                  <input
                    type="text"
                    placeholder="Enter Coupon (BMS50, ICICIRUSH, BOGO)"
                    className="promo-input"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  />
                  <button type="submit" className="btn-apply-promo">
                    Apply
                  </button>
                </form>
                {promoMsg && <p className="promo-status-msg">{promoMsg}</p>}
                <div className="quick-coupon-pills">
                  <span onClick={() => { setPromoCode('BMS50'); }}>Code: <strong>BMS50</strong> (₹50 off)</span>
                  <span onClick={() => { setPromoCode('ICICIRUSH'); }}>Code: <strong>ICICIRUSH</strong> (20% off)</span>
                  <span onClick={() => { setPromoCode('BOGO'); }}>Code: <strong>BOGO</strong> (Buy 1 Get 1)</span>
                </div>
              </div>

              {/* PRICE BREAKDOWN */}
              <div className="event-checkout-breakdown">
                <div className="breakdown-row">
                  <span>Tickets ({ticketCount} × {money(tierPrice)}):</span>
                  <strong>{money(baseTotal)}</strong>
                </div>
                <div className="breakdown-row">
                  <span>Convenience Fee & GST:</span>
                  <span>{money(convenienceFee)}</span>
                </div>
                {promoDiscount > 0 && (
                  <div className="breakdown-row discount">
                    <span>Discount Applied:</span>
                    <span>- {money(promoDiscount)}</span>
                  </div>
                )}
                <div className="breakdown-row total">
                  <span>Grand Total:</span>
                  <strong>{money(grandTotal)}</strong>
                </div>
              </div>
            </div>

            {/* CONFIRM BUTTON */}
            <div className="event-dialog-footer">
              <button
                type="button"
                className="btn-release-tickets-now"
                onClick={handleConfirmEventBooking}
                disabled={bookingLoading}
              >
                {bookingLoading ? 'Releasing Tickets...' : `Release ${ticketCount} Tickets • Pay ${money(grandTotal)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          CONFIRMED OFFICIAL M-TICKET PASS MODAL
          ===================================================================== */}
      {(confirmedBooking || viewingPass) && (
        <div className="event-modal-overlay" onClick={() => { setConfirmedBooking(null); setViewingPass(null); }}>
          <div className="event-modal-card m-ticket-confirmed-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => { setConfirmedBooking(null); setViewingPass(null); }}>✕</button>

            {/* Perforated Top Header */}
            <div className="confirmed-pass-top">
              <div className="pass-status-pill">
                <span className="pass-dot" />
                <span>CONFIRMED EVENT PASS</span>
              </div>
              <h2 className="pass-event-title">{(confirmedBooking || viewingPass).eventTitle}</h2>
              <p className="pass-show-time">📅 {(confirmedBooking || viewingPass).showTime}</p>
              <p className="pass-venue">📍 {(confirmedBooking || viewingPass).venue}, {(confirmedBooking || viewingPass).city}</p>
            </div>

            {/* Perforated Sawtooth Divider */}
            <div className="perforated-notch-divider">
              <span className="notch-left" />
              <span className="perforated-dashed-line" />
              <span className="notch-right" />
            </div>

            {/* Ticket Details & QR Pass */}
            <div className="confirmed-pass-body">
              <div className="pass-qr-box">
                {(confirmedBooking || viewingPass).qrCode ? (
                  <img
                    src={(confirmedBooking || viewingPass).qrCode}
                    alt="Authentic Event QR Code"
                    className="pass-qr-img"
                  />
                ) : (
                  <div className="qr-simulated">
                    <svg viewBox="0 0 100 100" width="130" height="130">
                      <rect width="100" height="100" fill="#fff" />
                      <path d="M10 10h30v30H10zm5 5v20h20V15zm45-5h30v30H60zm5 5v20h20V15zM10 60h30v30H10zm5 5v20h20V65zm45 0h10v10H60zm15 0h15v15H75zm-15 15h10v15H60zm15 10h15v5H75z" fill="#111" />
                    </svg>
                  </div>
                )}
                <span className="pass-ref-code">Ref: {(confirmedBooking || viewingPass).reference}</span>
              </div>

              <div className="pass-info-list">
                <div className="pass-info-item">
                  <span className="info-lbl">Pass Category:</span>
                  <strong className="info-val">{(confirmedBooking || viewingPass).tier}</strong>
                </div>
                <div className="pass-info-item">
                  <span className="info-lbl">Quantity:</span>
                  <strong className="info-val">{(confirmedBooking || viewingPass).ticketCount} Tickets</strong>
                </div>
                <div className="pass-info-item">
                  <span className="info-lbl">Primary Guest:</span>
                  <strong className="info-val">{(confirmedBooking || viewingPass).attendee?.name}</strong>
                </div>
                <div className="pass-info-item">
                  <span className="info-lbl">Total Paid:</span>
                  <strong className="info-val highlight">{money((confirmedBooking || viewingPass).grandTotal)}</strong>
                </div>
                {(confirmedBooking || viewingPass).tierPerks && (
                  <div className="pass-perks-box">
                    <span>🎁 <strong>Perks Included:</strong> {(confirmedBooking || viewingPass).tierPerks}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="confirmed-pass-footer">
              <p className="entry-instructions">
                ✓ Show this digital M-Ticket QR code at the entrance turnstile for direct entry.
              </p>
              <div className="pass-action-buttons">
                <button
                  type="button"
                  className="btn-print-pass"
                  onClick={() => window.print()}
                >
                  🖨️ Print / Save PDF
                </button>
                <button
                  type="button"
                  className="btn-done-pass"
                  onClick={() => { setConfirmedBooking(null); setViewingPass(null); }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
