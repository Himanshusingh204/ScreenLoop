// NotFound.jsx — Custom 404 page and helpful links
import React from 'react';
import { Link } from 'react-router-dom';
import { SiteHeader, SiteFooter } from '../components';
import { RocketLaunch, MagnifyingGlass } from '../components/icons';

export default function NotFound() {
  return (
    <div className="page-wrapper">
      <SiteHeader />

      <main id="main-content" tabIndex={-1} className="not-found-page-content">
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
            The page or room you are looking for may have been stopped by the host, expired, or the link has a typo. Rooms are temporary and end when the host leaves.
          </p>

          <div className="not-found-actions">
            <Link to="/" className="btn btn-primary btn-md">
              <RocketLaunch size={16} /> Back to Home
            </Link>
            <Link to="/help" className="btn btn-secondary btn-md">
              <MagnifyingGlass size={16} /> Help & FAQ
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
