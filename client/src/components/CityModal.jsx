import { useState, useEffect, useRef } from 'react';
import { api } from '../api';

const DEFAULT_POPULAR_CITIES = [
  { id: 'mumbai', name: 'Mumbai', state: 'Maharashtra', icon: '🏛️' },
  { id: 'delhi', name: 'Delhi-NCR', state: 'Delhi', icon: '🕌' },
  { id: 'bengaluru', name: 'Bengaluru', state: 'Karnataka', icon: '🏢' },
  { id: 'hyderabad', name: 'Hyderabad', state: 'Telangana', icon: '🏰' },
  { id: 'chandigarh', name: 'Chandigarh', state: 'Punjab / Haryana', icon: '✋' },
  { id: 'ahmedabad', name: 'Ahmedabad', state: 'Gujarat', icon: '🪁' },
  { id: 'chennai', name: 'Chennai', state: 'Tamil Nadu', icon: '🏖️' },
  { id: 'kolkata', name: 'Kolkata', state: 'West Bengal', icon: '🌉' },
  { id: 'pune', name: 'Pune', state: 'Maharashtra', icon: '⛰️' },
  { id: 'kochi', name: 'Kochi', state: 'Kerala', icon: '🌴' },
  { id: 'jalandhar', name: 'Jalandhar', state: 'Punjab', icon: '🎬' },
  { id: 'phagwara', name: 'Phagwara', state: 'Punjab', icon: '🎟️' },
];

export default function CityModal({ isOpen, onClose, selectedCity, onSelectCity }) {
  const dialogRef = useRef(null);
  const [search, setSearch] = useState('');
  const [cities, setCities] = useState(DEFAULT_POPULAR_CITIES);

  useEffect(() => {
    api('/bms/cities')
      .then((data) => {
        if (data?.cities?.length) setCities(data.cities);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const filteredCities = cities.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.state?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (cityName) => {
    onSelectCity(cityName);
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="bms-city-dialog"
      aria-labelledby="city-dialog-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="city-dialog-content">
        <div className="city-dialog-header">
          <div className="city-search-wrap">
            <span className="search-icon" aria-hidden="true">🔍</span>
            <input
              type="search"
              placeholder="Search for your city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="city-search-input"
              autoFocus
            />
          </div>
          <button
            type="button"
            className="city-dialog-close"
            onClick={onClose}
            aria-label="Close City Selector"
          >
            ✕
          </button>
        </div>

        <div className="city-dialog-body">
          <h3 id="city-dialog-title" className="city-section-title">
            Popular Cities
          </h3>

          <div className="popular-cities-grid">
            {filteredCities.map((city) => (
              <button
                key={city.id || city.name}
                type="button"
                className={`popular-city-btn ${selectedCity === city.name ? 'active' : ''}`}
                onClick={() => handleSelect(city.name)}
              >
                <span className="city-icon" aria-hidden="true">{city.icon || '🏙️'}</span>
                <span className="city-name">{city.name}</span>
                {selectedCity === city.name && <span className="city-check">✓</span>}
              </button>
            ))}
          </div>

          {!filteredCities.length && (
            <p className="city-no-results">No cities found matching "{search}".</p>
          )}

          <div className="city-detect-bar">
            <button
              type="button"
              className="btn-detect-location"
              onClick={() => handleSelect('Mumbai')}
            >
              <span aria-hidden="true">🎯</span> Detect my location
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

