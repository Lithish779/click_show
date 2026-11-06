import { useState } from 'react';
import { Link } from 'react-router-dom';

const ARTICLES = [
  {
    id: 1,
    title: 'The Resurrection of 70mm IMAX: Why Filmmakers Still Demand Analog Film',
    category: 'CINEMATOGRAPHY',
    readTime: '6 min read',
    date: 'Nov 06, 2026',
    author: 'Elena Rostova',
    authorRole: 'Chief Film Critic',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800',
    summary: 'From Oppenheimer to upcoming sci-fi epics, explore why the world’s top directors are pushing for physical 15/70mm film stock over 8K digital projection.',
    tags: ['IMAX', 'Film Tech', 'Analog Cinema'],
  },
  {
    id: 2,
    title: 'Inside Dolby Atmos Spatial Sound: Engineering 64 Discrete Audio Channels',
    category: 'AUDIO ENGINEERING',
    readTime: '4 min read',
    date: 'Nov 04, 2026',
    author: 'Marcus Vance',
    authorRole: 'Acoustic Specialist',
    image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800',
    summary: 'A deep dive into how overhead height channels and object-based metadata turn movie theater auditoriums into living acoustic environments.',
    tags: ['Dolby Atmos', 'Sound Design', 'Acoustics'],
  },
  {
    id: 3,
    title: 'From Stale Popcorn to Butler Truffle Fries: The Rise of Gourmet Theater Dining',
    category: 'LIFESTYLE & LUXURY',
    readTime: '5 min read',
    date: 'Nov 02, 2026',
    author: 'Aria Montgomery',
    authorRole: 'Culinary Editor',
    image: 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=800',
    summary: 'How premium cinema chains revolutionized in-theater concessions with wagyu sliders, craft mocktails, and button-summoned butler service.',
    tags: ['Dining', 'Luxury Lounge', 'Hospitality'],
  },
  {
    id: 4,
    title: 'Autumn 2026 Box Office Analysis: Indie Sensations Challenging Major Franchises',
    category: 'BOX OFFICE',
    readTime: '7 min read',
    date: 'Oct 29, 2026',
    author: 'Karan Mehra',
    authorRole: 'Industry Analyst',
    image: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=800',
    summary: 'Why original mid-budget storytelling and word-of-mouth festival hits are outperforming superhero sequels this theatrical season.',
    tags: ['Box Office', 'Trends', 'Indie Film'],
  },
];

export default function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const filtered = selectedCategory === 'ALL'
    ? ARTICLES
    : ARTICLES.filter((a) => a.category.includes(selectedCategory));

  return (
    <div className="bms-page-container">
      {/* Blog Hero Banner */}
      <div className="blog-hero-banner">
        <div className="blog-hero-content">
          <span className="blog-badge">🎬 MOVTIC CINEMA CHRONICLES</span>
          <h1 className="blog-hero-title">Stories, Technology & The Art of Cinema</h1>
          <p className="blog-hero-subtitle">
            Exclusive director interviews, theater technology breakdowns, and behind-the-scenes insights from premier auditoriums worldwide.
          </p>

          <div className="blog-filter-pills">
            {['ALL', 'CINEMATOGRAPHY', 'AUDIO ENGINEERING', 'LIFESTYLE & LUXURY', 'BOX OFFICE'].map((cat) => (
              <button
                key={cat}
                type="button"
                className={`blog-pill ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Articles Grid */}
      <div className="blog-articles-grid">
        {filtered.map((art) => (
          <article key={art.id} className="blog-card">
            <div className="blog-card-media">
              <img src={art.image} alt={art.title} className="blog-card-img" loading="lazy" />
              <span className="blog-card-cat">{art.category}</span>
            </div>

            <div className="blog-card-content">
              <div className="blog-card-meta">
                <span className="blog-date">{art.date}</span>
                <span className="blog-sep">•</span>
                <span className="blog-read-time">{art.readTime}</span>
              </div>

              <h2 className="blog-card-title">{art.title}</h2>
              <p className="blog-card-summary">{art.summary}</p>

              <div className="blog-card-footer">
                <div className="blog-author-info">
                  <span className="author-avatar">{art.author[0]}</span>
                  <div>
                    <strong className="author-name">{art.author}</strong>
                    <span className="author-role">{art.authorRole}</span>
                  </div>
                </div>

                <Link to="/" className="btn-read-article">
                  Read More →
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
