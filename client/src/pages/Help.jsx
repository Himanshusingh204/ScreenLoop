// Help.jsx — Help & FAQ page with searchable sections and troubleshooting guides
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SiteHeader, SiteFooter } from '../components';
import { staggerContainer, fadeInUp } from '../hooks/useScrollReveal';
import {
  FilmStrip, MagnifyingGlass, Sparkle, ArrowRight, ShieldCheck,
  SpeakerSimpleHigh, MonitorPlay, Key, LockSimple
} from '../components/icons';

const faqSections = [
  {
    title: 'Getting Started',
    items: [
      {
        q: 'How do I create a watch party?',
        a: 'Click "Launch Room" or "Create Watch Room" on the home page. You will get a unique link with built-in end-to-end encryption. Share it with friends — they can join instantly in their browser.',
      },
      {
        q: 'Do I or my friends need to create an account?',
        a: 'No. Screenloop requires zero sign-up. There are no passwords to remember, no email forms, and no app installs required.',
      },
      {
        q: 'How many people can join a room?',
        a: 'Up to 10 participants per room. This ensures smooth direct WebRTC peer-to-peer streaming with high framerates and crystal-clear audio on typical home connections.',
      },
      {
        q: 'What browsers are supported?',
        a: 'Chrome, Edge, Firefox, Brave, and Safari (desktop & mobile). Native WebRTC is supported out of the box in all modern browsers.',
      },
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Audio & Video Troubleshooting',
    items: [
      {
        q: 'I cannot hear audio from Netflix, YouTube, or desktop video',
        a: 'When clicking "Share Screen", make sure to select a Chrome/Edge Tab or Entire Screen and ensure the "Share system audio" / "Also share tab audio" checkbox is checked at the bottom of the browser picker.',
      },
      {
        q: 'Audio is muted when I first join the room',
        a: 'Web browsers prevent videos from playing sound automatically without user interaction. Click anywhere on the video stage or the Unmute button in the ControlBar to enable audio.',
      },
      {
        q: 'The stream is lagging or buffering',
        a: 'Try lowering the stream quality preset in the ControlBar from 1080p to 720p or 480p. Also check the Telemetry HUD (BarChart icon) to inspect your packet loss and latency.',
      },
      {
        q: 'Screen share permissions error',
        a: 'Ensure you have granted your browser screen recording permissions in OS settings (especially on macOS under System Settings > Privacy & Security > Screen Recording).',
      },
    ],
  },
  {
    title: 'Security & Cryptography',
    items: [
      {
        q: 'How does End-to-End Encryption work in Screenloop?',
        a: 'When a room is created, the host browser generates an AES-256-GCM key and embeds it in the URL hash fragment (#key). Since browsers never send hash fragments to servers, the server only sees the room ID — it can\'t decrypt your messages. Anyone you share the full link with (including the #key part) can decrypt.',
      },
      {
        q: 'Can the server owner see my screen or messages?',
        a: 'No. Screen video flows directly peer-to-peer over WebRTC (DTLS-SRTP), and chat messages are encrypted client-side. The server acts as a blind signaling relay and never stores media.',
      },
      {
        q: 'What happens when a room PIN is set?',
        a: 'PINs are checked in-memory and protected with sliding-window brute-force rate limiters that temporarily ban attackers after 5 failed attempts.',
      },
    ],
  },
  {
    id: 'shortcuts',
    title: 'Keyboard Shortcuts',
    items: [
      {
        q: 'What keyboard shortcuts are available in the room?',
        a: 'Press "F" to toggle Cinema Fullscreen mode. Press "Esc" to exit fullscreen or dismiss open overlays and modals. In chat, press "Enter" to send and "Shift+Enter" for multi-line messages.',
      },
    ],
  },
];

export default function Help() {
  const [search, setSearch] = useState('');
  const [openIndex, setOpenIndex] = useState(null);

  const filtered = faqSections.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        !search ||
        item.q.toLowerCase().includes(search.toLowerCase()) ||
        item.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((section) => section.items.length > 0);

  return (
    <div className="page-wrapper">
      <SiteHeader />

      <main className="help-page-content">
        <motion.div
          className="help-container"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.section className="page-hero" variants={fadeInUp}>
            <div className="hero-pill">
              <Sparkle size={14} className="pill-icon" />
              <span>FAQ & Troubleshooting</span>
            </div>
            <h1 className="page-hero-title">Help & Frequently Asked Questions</h1>
            <p className="page-hero-subtitle">
              Common questions about setting up rooms, sharing audio, and how the encryption works.
            </p>

            {/* Search Box */}
            <div className="help-search-box">
              <MagnifyingGlass size={20} className="help-search-icon" />
              <input
                type="text"
                className="help-search-input"
                placeholder="Search questions (e.g. audio, encryption, pin, lag)…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search frequently asked questions"
              />
              {search && (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => setSearch('')}
                >
                  Clear
                </button>
              )}
            </div>
          </motion.section>

          {/* Quick Guides Row */}
          <motion.section className="help-quick-guides-row" variants={fadeInUp}>
            <div className="quick-guide-card glass-card">
              <div className="guide-icon"><SpeakerSimpleHigh size={24} /></div>
              <h3>Sharing System Audio</h3>
              <p>Check "Share tab audio" in the browser screen-share picker to include movie or music audio.</p>
            </div>
            <div className="quick-guide-card glass-card">
              <div className="guide-icon"><LockSimple size={24} /></div>
              <h3>Encrypted Chat</h3>
              <p>Keep the full URL (including the #key part) intact when sharing invite links — that's the decryption key.</p>
              <Link to="/security" className="card-inline-link">How encryption works →</Link>
            </div>
            <div className="quick-guide-card glass-card">
              <div className="guide-icon"><MonitorPlay size={24} /></div>
              <h3>Best Connection Quality</h3>
              <p>For smoother streaming, use a wired connection or 5 GHz Wi-Fi, and try the 720p quality preset.</p>
              <Link to="/features" className="card-inline-link">See all features →</Link>
            </div>
          </motion.section>

          {/* FAQ Layout: Sidebar + Content */}
          <div className="help-layout">
            <nav className="help-sidebar">
              {filtered.map((section, i) => (
                <a key={i} href={`#${section.id || section.title.toLowerCase().replace(/\s/g, '-')}`}
                   className="help-sidebar-link">
                  {section.title}
                </a>
              ))}
              <a href="#compatibility" className="help-sidebar-link">Compatibility</a>
            </nav>

            <div className="help-faq-container">
              {filtered.length === 0 && (
                <div className="help-no-results">
                  <p>No questions matched your search query "{search}".</p>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSearch('')}
                  >
                    View All Questions
                  </button>
                </div>
              )}

              {filtered.map((section, si) => (
                <motion.section
                  key={si}
                  id={section.id || undefined}
                  className="help-faq-section"
                  variants={fadeInUp}
                >
                  <h2 className="help-faq-section-title">{section.title}</h2>
                  {section.items.map((item, ii) => {
                    const globalIndex = `${si}-${ii}`;
                    const isOpen = openIndex === globalIndex;
                    return (
                      <div
                        key={ii}
                        className={`help-faq-item glass-card ${isOpen ? 'open' : ''}`}
                      >
                        <button
                          type="button"
                          className="help-faq-question"
                          onClick={() => setOpenIndex(isOpen ? null : globalIndex)}
                          aria-expanded={isOpen}
                        >
                          <span>{item.q}</span>
                          <span className="help-faq-chevron" aria-hidden="true">
                            {isOpen ? '−' : '+'}
                          </span>
                        </button>
                        {isOpen && (
                          <div className="help-faq-answer">
                            <p>{item.a}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </motion.section>
              ))}
            </div>
          </div>

          {/* Browser Compatibility */}
          <motion.section className="help-section" variants={fadeInUp} id="compatibility">
            <div className="section-header-centered">
              <span className="section-eyebrow">Compatibility</span>
              <h2 className="section-title">Tested Web Browsers</h2>
            </div>
            <div className="help-compat-table glass-card">
              <div className="help-compat-row help-compat-header">
                <span>Browser</span>
                <span>Screen Sharing</span>
                <span>System Audio</span>
                <span>Encrypted Chat</span>
              </div>
              {[
                ['Google Chrome (72+)', 'Yes', 'Yes', 'Yes'],
                ['Microsoft Edge (79+)', 'Yes', 'Yes', 'Yes'],
                ['Mozilla Firefox (66+)', 'Yes', 'Yes', 'Yes'],
                ['Apple Safari (14+)', 'Yes', 'Yes', 'Yes'],
                ['Brave Browser', 'Yes', 'Yes', 'Yes'],
              ].map(([browser, share, audio, crypto], i) => (
                <div key={i} className="help-compat-row">
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{browser}</span>
                  <span>{share}</span>
                  <span>{audio}</span>
                  <span>{crypto}</span>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Still need help */}
          <motion.section className="help-section" variants={fadeInUp}>
            <div className="section-header-centered">
              <h2 className="section-title">Still stuck?</h2>
              <p className="section-desc">
                Open a GitHub issue with your browser, device, and steps to reproduce — we'll take a look.
              </p>
              <a
                href="https://github.com/Himanshusingh204/ScreenLoop/issues"
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ marginTop: 'var(--space-3)' }}
              >
                Report a Problem
              </a>
            </div>
          </motion.section>
        </motion.div>
      </main>

      <SiteFooter />
    </div>
  );
}
