import { useState, useEffect } from 'react';
import { api } from '../api';
import { Loading } from '../components';

export default function OffersPage() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState('');

  useEffect(() => {
    api('/bms/offers')
      .then((data) => {
        setOffers(data?.offers || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  return (
    <div className="bms-page-container">
      <div className="bms-page-header">
        <span className="bms-page-badge">Exclusive Deals</span>
        <h1 className="bms-page-title">Offers & Discounts</h1>
        <p className="bms-page-desc">
          Save on your movie tickets, concessions, and event passes with top credit cards and promo coupons.
        </p>
      </div>

      {loading && <Loading label="Loading latest offers..." />}

      <div className="offers-grid">
        {offers.map((offer) => (
          <div key={offer.code} className="offer-card">
            <div className="offer-card-top">
              <span className="offer-bank-badge">{offer.bank}</span>
              {offer.badge && <span className="offer-tag-badge">{offer.badge}</span>}
            </div>

            <h3 className="offer-title">{offer.title}</h3>
            <p className="offer-desc">{offer.description}</p>

            <div className="offer-footer">
              <div className="offer-code-box">
                <span className="code-label">CODE:</span>
                <strong className="code-value">{offer.code}</strong>
              </div>
              <button
                type="button"
                className="btn-copy-code"
                onClick={() => handleCopy(offer.code)}
              >
                {copiedCode === offer.code ? '✓ Copied!' : 'Copy Code'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
