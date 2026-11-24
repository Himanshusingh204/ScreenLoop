// SiteFooter.jsx — Universal footer with layered animated wave divider
import React from 'react';
import { Link } from 'react-router-dom';
import { FilmStrip, LockSimple, ShieldCheck, Lightning, GithubLogo, Heart } from './icons';

const WAVE_PATH =
  'M-160 44c30 0 58-18 88-18s58 18 88 18 58-18 88-18 58 18 88 18v44h-352z';

export function SiteFooter() {
  return (
    <footer className="site-footer" role="contentinfo">
      {/* Layered parallax waves — decorative */}
      <div className="footer-waves" aria-hidden="true">
        <svg viewBox="0 24 150 28" preserveAspectRatio="none" focusable="false">
          <defs>
            <path id="footer-wave-path" d={WAVE_PATH} />
          </defs>
          <g className="footer-wave-parallax">
            <use href="#footer-wave-path" x="48" y="0" className="footer-wave footer-wave-1" />
            <use href="#footer-wave-path" x="48" y="3" className="footer-wave footer-wave-2" />
            <use href="#footer-wave-path" x="48" y="5" className="footer-wave footer-wave-3" />
            <use href="#footer-wave-path" x="48" y="7" className="footer-wave footer-wave-4" />
          </g>
        </svg>
      </div>

      <div className="site-footer-body">
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
              Watch together and meet face to face. No accounts, no downloads, no tracking.
            </p>

            <ul className="site-footer-facts">
              <li><LockSimple size={13} /> Chat encrypted with AES-256 in your browser</li>
              <li><Lightning size={13} /> Fast streaming through a LiveKit SFU, with peer-to-peer fallback</li>
              <li><ShieldCheck size={13} /> Free to use, open source under MIT</li>
            </ul>
          </div>

          {/* Navigation Grid */}
          <div className="site-footer-nav-grid">
            <div className="footer-link-group">
              <h4 className="footer-group-title">Product</h4>
              <ul className="footer-links-list">
                <li><Link to="/">Watch Room Launcher</Link></li>
                <li>
                  <Link to="/meet">
                    Video Meet <span className="nav-new-badge footer-new-badge">New</span>
                  </Link>
                </li>
                <li><Link to="/features">Features</Link></li>
                <li><Link to="/security">Security</Link></li>
                <li><Link to="/about">About</Link></li>
                <li><Link to="/changelog">What&apos;s new</Link></li>
                <li><Link to="/roadmap">Roadmap</Link></li>
              </ul>
            </div>

            <div className="footer-link-group">
              <h4 className="footer-group-title">Resources</h4>
              <ul className="footer-links-list">
                <li><Link to="/help">Help center &amp; FAQ</Link></li>
                <li><Link to="/help#troubleshooting">Audio &amp; screen troubleshooting</Link></li>
                <li><Link to="/help#shortcuts">Keyboard shortcuts</Link></li>
                <li><Link to="/contact">Contact &amp; feedback</Link></li>
              </ul>
            </div>

            <div className="footer-link-group">
              <h4 className="footer-group-title">Trust &amp; legal</h4>
              <ul className="footer-links-list">
                <li><Link to="/privacy">Privacy policy</Link></li>
                <li><Link to="/terms">Terms of service</Link></li>
                <li><Link to="/accessibility">Accessibility</Link></li>
                <li>
                  <a
                    href="https://github.com/Himanshusingh204/ScreenLoop/blob/main/LICENSE"
                    target="_blank"
                    rel="noreferrer"
                  >
                    MIT license
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/Himanshusingh204/ScreenLoop"
                    target="_blank"
                    rel="noreferrer"
                    className="footer-github-link"
                  >
                    <GithubLogo size={14} /> GitHub
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
              © {new Date().getFullYear()} Screenloop. No accounts, no trackers.
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
      </div>
    </footer>
  );
}
