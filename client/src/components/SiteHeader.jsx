// SiteHeader.jsx — Universal navigation bar for all informational pages
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { RocketLaunch, GithubLogo, X, Sliders } from './icons';
import { ThemeSelector } from './ThemeSelector';
import LogoBrand from './LogoBrand';
import { generateRoomId, generateRoomKey } from '../utils';

const NAV_LINKS = [
  { path: '/', label: 'Home' },
  { path: '/features', label: 'Features' },
  { path: '/security', label: 'Security' },
  { path: '/about', label: 'About' },
  { path: '/help', label: 'Help & FAQ' },
  { path: '/changelog', label: "What's New", badge: 'New' },
];

export function SiteHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  const handleQuickLaunch = async () => {
    try {
      setIsLaunching(true);
      const roomId = generateRoomId();
      const rawKey = await generateRoomKey();
      const targetPath = `/room/${roomId}?host=true${rawKey ? '#' + rawKey : ''}`;
      navigate(targetPath, { state: { isCreator: true } });
    } catch (err) {
      console.error('Quick launch error:', err);
      navigate('/');
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <header className="site-header" role="banner">
      <div className="site-header-container">
        {/* Brand */}
        <Link to="/" className="site-header-brand" aria-label="Screenloop Home">
          <LogoBrand size={32} />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="site-header-nav" aria-label="Main Navigation">
          {NAV_LINKS.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`site-nav-link ${isActive ? 'active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {link.label}
                {link.badge && <span className="nav-new-badge">{link.badge}</span>}
                {isActive && <span className="nav-active-indicator" />}
              </Link>
            );
          })}
        </nav>

        {/* Header Actions */}
        <div className="site-header-actions">
          <ThemeSelector />

          <a
            href="https://github.com/Himanshusingh204/ScreenLoop"
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost btn-sm github-header-btn"
            aria-label="View on GitHub"
            title="GitHub Repository"
          >
            <GithubLogo size={18} />
            <span className="hide-mobile-text">GitHub</span>
          </a>

          <button
            type="button"
            className="btn btn-primary btn-sm site-launch-btn"
            onClick={handleQuickLaunch}
            disabled={isLaunching}
            aria-label="Launch new watch party room"
          >
            <RocketLaunch size={15} />
            <span>{isLaunching ? 'Launching…' : 'Launch Room'}</span>
          </button>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            className="btn btn-ghost btn-sm mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={20} /> : <Sliders size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer" role="dialog" aria-modal="true">
          <nav className="mobile-nav-links">
            {NAV_LINKS.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`mobile-nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
{link.label}
                  {link.badge && <span className="nav-new-badge">{link.badge}</span>}
                </Link>
              );
            })}
            <div className="mobile-drawer-footer">
              <button
                type="button"
                className="btn btn-primary btn-md w-full"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleQuickLaunch();
                }}
              >
                <RocketLaunch size={16} /> Launch Watch Room
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
