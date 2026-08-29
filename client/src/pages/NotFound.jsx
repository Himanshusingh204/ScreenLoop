// NotFound.jsx — Custom 404 page with auto-redirect and helpful links
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SiteHeader, SiteFooter } from '../components';
import { FilmStrip, RocketLaunch, ArrowRight, MagnifyingGlass } from '../components/icons';

export default function NotFound() {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (countdown <= 0) {
      window.location.href = '/';
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  return (
    <div className="page-wrapper">
      <SiteHeader />

      <main className="not-found-page-content">
        <div className="not-found-card glass-card">
          <div className="not-found-illustration">
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="60" cy="60" r="58" stroke="var(--border-strong)" strokeWidth="2" strokeDasharray="8 4" />
              <path d="M40 50 L60 70 L80 50" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <line x1="60" y1="30" x2="60" y2="45" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
              <circle cx="60" cy="85" r="3" fill="var(--accent)" />
            </svg>
          </div>
          <h1 className="not-found-title">404</h1>
          <p className="not-found-subtitle">Room or page not found</p>
          <p className="not-found-message">
            The watch room you are looking for may have been stopped by the host, expired, or the link has a typo.
          </p>

          <div className="not-found-actions">
            <Link to="/" className="btn btn-primary btn-md">
              <RocketLaunch size={16} /> Launch New Room
            </Link>
            <Link to="/help" className="btn btn-secondary btn-md">
              <MagnifyingGlass size={16} /> Help & FAQ
            </Link>
          </div>

          <div className="not-found-countdown-box">
            <span>Redirecting to Home in <strong>{countdown}s</strong>…</span>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
