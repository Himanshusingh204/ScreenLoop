// SiteFooter.jsx — Universal multi-column footer connecting all pages
import React from 'react';
import { Link } from 'react-router-dom';
import { FilmStrip, LockSimple, ShieldCheck, GithubLogo, Heart } from './icons';

export function SiteFooter() {
  return (
    <footer className="site-footer" role="contentinfo">
      <div className="site-footer-container">
        {/* Brand Column */}
        <div className="site-footer-brand-col">
          <Link to="/" className="site-footer-brand">
            <div className="brand-badge-wrapper sm">
              <FilmStrip size={18} weight="bold" className="brand-badge-icon" />
            </div>
            <span className="brand-title">Screenloop</span>
          </Link>
          <p className="site-footer-tagline">
            Ultra-HD peer-to-peer watch parties with uncompressed 48kHz cinema audio, live drawing, and AES-256 end-to-end encryption.
          </p>
          <div className="site-footer-p2p-badge">
            <span className="status-dot-pulse" aria-hidden="true" />
            <span>P2P Direct Mesh • 100% Client-Side Privacy</span>
          </div>
        </div>

        {/* Navigation Grid */}
        <div className="site-footer-nav-grid">
          {/* Product Column */}
          <div className="footer-link-group">
            <h4 className="footer-group-title">Product</h4>
            <ul className="footer-links-list">
              <li><Link to="/">Watch Room Launcher</Link></li>
              <li><Link to="/features">Features Showcase</Link></li>
              <li><Link to="/security">Security Architecture</Link></li>
              <li><Link to="/about">About Screenloop</Link></li>
            </ul>
          </div>

          {/* Resources Column */}
          <div className="footer-link-group">
            <h4 className="footer-group-title">Resources & Help</h4>
            <ul className="footer-links-list">
              <li><Link to="/help">Help Center & FAQ</Link></li>
              <li><Link to="/help#troubleshooting">Audio & Screen Troubleshooting</Link></li>
              <li><Link to="/help#shortcuts">Keyboard Shortcuts</Link></li>
              <li><Link to="/features#comparison">Platform Comparison</Link></li>
            </ul>
          </div>

          {/* Trust & Legal Column */}
          <div className="footer-link-group">
            <h4 className="footer-group-title">Trust & Legal</h4>
            <ul className="footer-links-list">
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms of Service</Link></li>
              <li>
                <a
                  href="https://github.com/Himanshusingh204/ScreenLoop/blob/main/LICENSE"
                  target="_blank"
                  rel="noreferrer"
                >
                  MIT License
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/Himanshusingh204/ScreenLoop"
                  target="_blank"
                  rel="noreferrer"
                  className="footer-github-link"
                >
                  <GithubLogo size={14} /> GitHub Repository
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="site-footer-bottom">
        <div className="site-footer-bottom-container">
          <div className="footer-copyright">
            © {new Date().getFullYear()} Screenloop Pro. Zero media stored. Zero tracking.
          </div>
          <div className="footer-crafted-by">
            <span>Crafted with</span>
            <Heart size={14} weight="fill" className="footer-heart-icon" />
            <span>by</span>
            <a
              href="https://github.com/Himanshusingh204"
              target="_blank"
              rel="noreferrer"
              className="footer-author-link"
            >
              Himanshu
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
