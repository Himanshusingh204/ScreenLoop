import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { generateRoomId, generateRoomKey, withViewTransition, getRecentRooms, clearRecentRooms, formatRelativeTime } from '../utils';
import { ThemeSelector, SiteHeader, SiteFooter } from '../components';
import {
  FilmStrip, RocketLaunch, LinkSimple, LockSimple, PencilSimple,
  Lightning, ChartBar, Phone, GithubLogo, ArrowRight, ShieldCheck, Clock
} from '../components/icons';

import { staggerContainer, fadeInUp, slideInRight } from '../hooks/useScrollReveal';

export default function Home() {
  const navigate = useNavigate();

  const [tab, setTab] = useState('create');
  const [pin, setPin] = useState('');
  const [joinUrl, setJoinUrl] = useState('');
  const [error, setError] = useState('');
  const [activeFaq, setActiveFaq] = useState(null);
  const [recentRooms, setRecentRooms] = useState(() => getRecentRooms());

  const clearRooms = () => {
    clearRecentRooms();
    setRecentRooms([]);
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const roomId = generateRoomId();
      const rawKey = await generateRoomKey();
      const targetPath = `/room/${roomId}?host=true${rawKey ? '#' + rawKey : ''}`;

      if (pin.trim()) {
        sessionStorage.setItem(`room-pin-${roomId}`, pin.trim());
      }

      withViewTransition(() => {
        navigate(targetPath, { state: { pin: pin.trim(), isCreator: true } });
      });
    } catch (err) {
      console.error('Room creation failed:', err);
      setError('Could not initialize secure room. Please try again.');
    }
  };

  const handleJoinByUrl = (e) => {
    e.preventDefault();
    setError('');
    const input = joinUrl.trim();

    if (!input) {
      setError('Please enter a valid room link or ID.');
      return;
    }

    try {
      let targetPath = '';
      if (input.startsWith('http://') || input.startsWith('https://')) {
        const parsed = new URL(input);
        targetPath = parsed.pathname + parsed.hash;
      } else if (input.startsWith('/room/')) {
        targetPath = input;
      } else {
        targetPath = `/room/${input}`;
      }

      if (!targetPath.includes('/room/')) {
        setError('Invalid Screenloop room URL format.');
        return;
      }

      withViewTransition(() => {
        navigate(targetPath);
      });
    } catch {
      setError('Invalid link format. Please check the URL.');
    }
  };

  const toggleFaq = (idx) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  const faqs = [
    {
      q: 'Do my friends need to create an account or install anything?',
      a: 'No accounts. No installs. Just a link. Screenloop runs 100% in any modern browser (Chrome, Edge, Brave, Firefox, Safari) using native WebRTC peer-to-peer protocols.',
    },
    {
      q: 'How is the chat encrypted?',
      a: 'When you create a room, your browser generates an AES-256 encryption key and puts it in the URL hash (#key). Browsers never send hash fragments to the server, so even we can\'t read your messages. Anyone you share the full link with can decrypt them.',
    },
    {
      q: 'Will my friends hear audio from Netflix, YouTube, or VLC?',
      a: 'Yes! When prompted by your browser to choose a window or tab, ensure "Share system audio" is checked. Screenloop is tuned with 48kHz uncompressed audio specifically for movies.',
    },
    {
      q: 'Is there any time limit or participant limit?',
      a: 'No time limits. For optimal performance on standard home internet connections, WebRTC mesh handles 2-10 simultaneous viewers in crisp HD.',
    },
  ];

  return (
    <motion.div
      className="home-layout"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >

      <SiteHeader />

      <main className="home-hero">
        <motion.div className="hero-content" variants={fadeInUp}>
          <div className="hero-pill">
            <span className="pill-dot" aria-hidden="true" />
            <span>Peer-to-Peer • No Accounts • E2E Encrypted Chat</span>
          </div>

          <h1 className="hero-title">
            Watch Movies Together, <br />
            <span className="hero-title-accent">Right From Your Browser</span>
          </h1>
          <p className="hero-description">
            Share your screen with friends in HD, with full movie audio. No installs, no signups, no video hitting a server — just send a link and press play.
          </p>
        </motion.div>

        <motion.div className="hero-action-card" variants={fadeInUp} role="region" aria-label="Room Launcher">
          <div className="card-tabs" role="tablist" aria-label="Room Action Selection">
            <button
              id="tab-create"
              type="button"
              role="tab"
              aria-selected={tab === 'create'}
              aria-controls="panel-create"
              className={`card-tab ${tab === 'create' ? 'active' : ''}`}
              onClick={() => { setTab('create'); setError(''); }}
            >
              <RocketLaunch size={18} /> Create Watch Room
            </button>
            <button
              id="tab-join"
              type="button"
              role="tab"
              aria-selected={tab === 'join'}
              aria-controls="panel-join"
              className={`card-tab ${tab === 'join' ? 'active' : ''}`}
              onClick={() => { setTab('join'); setError(''); }}
            >
              <LinkSimple size={18} /> Join via Link
            </button>
          </div>

          {tab === 'create' && (
            <motion.div
              id="panel-create"
              role="tabpanel"
              aria-labelledby="tab-create"
              className="card-body"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <p className="card-info-text">
                Start a session as the <strong style={{ color: 'var(--text-primary)' }}>Host</strong>. You can share any movie tab, video player, or desktop window with friends.
              </p>
              <form onSubmit={handleCreateRoom} className="flex flex-col gap-4">
                <div className="card-input-group">
                  <label className="card-input-label" htmlFor="create-pin-input">
                    Optional Room PIN / Password
                  </label>
                  <input
                    id="create-pin-input"
                    type="password"
                    className="input"
                    placeholder="Leave empty for open access…"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    maxLength={20}
                    autoComplete="new-password"
                  />
                </div>
                {error && (
                  <p className="card-error-text" role="alert">
                    {error}
                  </p>
                )}
                <button
                  id="create-room-submit-btn"
                  type="submit"
                  className="btn btn-primary btn-lg w-full card-action-btn"
                >
                  Launch Watch Room
                </button>
              </form>
              <div className="card-footer">
                <span className="security-badge">
                  <LockSimple size={14} /> AES-256 GCM Key auto-generated in URL hash fragment
                </span>
              </div>
            </motion.div>
          )}

          {tab === 'join' && (
            <motion.div
              id="panel-join"
              role="tabpanel"
              aria-labelledby="tab-join"
              className="card-body"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <p className="card-info-text">
                Paste the invite URL or room link shared by your friend to jump straight in.
              </p>
              <form onSubmit={handleJoinByUrl} className="flex flex-col gap-4">
                <div className="card-input-group">
                  <label className="card-input-label" htmlFor="join-url-input">
                    Invite Link or Room Code
                  </label>
                  <input
                    id="join-url-input"
                    type="text"
                    className="input"
                    placeholder="https://screenloop.app/room/x7k2m9qp#key…"
                    value={joinUrl}
                    onChange={(e) => setJoinUrl(e.target.value)}
                    autoFocus
                    autoComplete="url"
                  />
                </div>
                {error && (
                  <p className="card-error-text" role="alert">
                    {error}
                  </p>
                )}
                <button
                  id="join-room-submit-btn"
                  type="submit"
                  className="btn btn-primary btn-lg w-full card-action-btn"
                >
                  Enter Room
                </button>
              </form>
              <div className="card-footer">
                <span className="security-badge">
                  Zero-lag direct WebRTC peer connection
                </span>
              </div>
            </motion.div>
          )}
        </motion.div>

        {recentRooms.length > 0 && (
          <motion.div className="recent-rooms" variants={fadeInUp} aria-label="Recent Rooms">
            <div className="recent-rooms-header">
              <span className="recent-rooms-title">
                <Clock size={14} /> Recent Rooms
              </span>
              <button
                type="button"
                className="recent-rooms-clear"
                onClick={clearRooms}
                aria-label="Clear recent rooms history"
              >
                Clear
              </button>
            </div>
            <div className="recent-rooms-list">
              {recentRooms.map((room) => (
                <button
                  key={room.roomId}
                  type="button"
                  className="recent-room-chip"
                  onClick={() => withViewTransition(() => navigate(`/room/${room.roomId}`))}
                  title={`Join room ${room.roomId}`}
                >
                  <span className="recent-room-id">{room.roomId}</span>
                  <span className="recent-room-time">{formatRelativeTime(room.timestamp)}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </main>

      {/* Features Showcase Grid */}
      <section className="home-features" aria-label="Key Features">
        <motion.div className="features-header" variants={fadeInUp}>
          <h2 className="features-title">What Screenloop Actually Does</h2>
          <p className="features-sub">A short list of things that matter when watching movies with friends remotely.</p>
        </motion.div>

        <motion.div className="features-grid" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
          <motion.div className="feature-card" variants={fadeInUp}>
            <div className="feature-icon" aria-hidden="true"><FilmStrip size={32} weight="bold" /></div>
            <h3 className="feature-heading">Full Movie Audio, Not Voice-Chat Audio</h3>
            <p className="feature-text">
              Most screen-sharing tools kill your audio quality with echo cancellation. We skip that — film scores and surround sound come through the way they were mixed.
            </p>
          </motion.div>

          <motion.div className="feature-card" variants={fadeInUp}>
            <div className="feature-icon" aria-hidden="true"><LockSimple size={32} weight="bold" /></div>
            <h3 className="feature-heading">Encrypted Chat, Server Can't Read It</h3>
            <p className="feature-text">
              Chat messages are encrypted in your browser. The decryption key lives in the URL hash — browsers never send that to the server, so it's invisible to us.
            </p>
          </motion.div>

          <motion.div className="feature-card" variants={fadeInUp}>
            <div className="feature-icon" aria-hidden="true"><PencilSimple size={32} weight="bold" /></div>
            <h3 className="feature-heading">Draw on the Stream Together</h3>
            <p className="feature-text">
              Point at things, draw arrows, highlight scenes — all synchronized live on top of the video. Useful for movie nights and screen-sharing work sessions alike.
            </p>
          </motion.div>

          <motion.div className="feature-card" variants={fadeInUp}>
            <div className="feature-icon" aria-hidden="true"><Lightning size={32} weight="bold" /></div>
            <h3 className="feature-heading">Volume Booster for Quiet Scenes</h3>
            <p className="feature-text">
              Built-in audio compressor evens out quiet dialogue and loud action scenes so you don't have to keep reaching for the volume slider.
            </p>
          </motion.div>

          <motion.div className="feature-card" variants={fadeInUp}>
            <div className="feature-icon" aria-hidden="true"><ChartBar size={32} weight="bold" /></div>
            <h3 className="feature-heading">Connection Quality Dashboard</h3>
            <p className="feature-text">
              A small overlay showing framerate, bitrate, and packet loss — handy when something feels off and you want to know why.
            </p>
          </motion.div>

          <motion.div className="feature-card" variants={fadeInUp}>
            <div className="feature-icon" aria-hidden="true"><Phone size={32} weight="bold" /></div>
            <h3 className="feature-heading">QR Code for Quick Mobile Join</h3>
            <p className="feature-text">
              Friends on their phones can scan a QR code from your screen to join — no typing long room IDs, generated locally in your browser.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* FAQ Section */}
      <section className="home-faq-section" aria-label="Frequently Asked Questions">
        <motion.div className="features-header" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <h2 className="features-title">Common Questions</h2>
          <p className="features-sub">Quick answers before you create a room.</p>
        </motion.div>

        <motion.div className="faq-container" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}>
          {faqs.map((faq, idx) => {
            const isExpanded = activeFaq === idx;
            return (
              <motion.div
                key={idx}
                className={`faq-item ${isExpanded ? 'expanded' : ''}`}
                variants={fadeInUp}
              >
                <button
                  type="button"
                  className="faq-question"
                  onClick={() => toggleFaq(idx)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      const nextBtn = e.currentTarget.closest('.faq-item')?.nextElementSibling?.querySelector('.faq-question');
                      nextBtn?.focus();
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      const prevBtn = e.currentTarget.closest('.faq-item')?.previousElementSibling?.querySelector('.faq-question');
                      prevBtn?.focus();
                    } else if (e.key === 'Home') {
                      e.preventDefault();
                      const firstBtn = e.currentTarget.closest('.faq-container')?.querySelector('.faq-question');
                      firstBtn?.focus();
                    } else if (e.key === 'End') {
                      e.preventDefault();
                      const items = e.currentTarget.closest('.faq-container')?.querySelectorAll('.faq-question');
                      items?.length && items[items.length - 1].focus();
                    }
                  }}
                  aria-expanded={isExpanded}
                  aria-controls={`faq-answer-${idx}`}
                >
                  <span>{faq.q}</span>
                  <span className="faq-toggle" aria-hidden="true">{isExpanded ? '-' : '+'}</span>
                </button>
                {isExpanded && (
                  <motion.div
                    id={`faq-answer-${idx}`}
                    className="faq-answer"
                    role="region"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {faq.a}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* Keyboard Shortcuts Cheatsheet */}
      <section className="shortcuts-section" aria-label="Keyboard Shortcuts">
        <motion.h4 className="shortcuts-title" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          Quick Keyboard Shortcuts
        </motion.h4>
        <motion.div className="shortcuts-grid" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.div className="shortcut-item" variants={fadeInUp}><kbd>M</kbd> <span>Toggle Mute / Unmute</span></motion.div>
          <motion.div className="shortcut-item" variants={fadeInUp}><kbd>F</kbd> <span>Toggle Cinema Fullscreen</span></motion.div>
          <motion.div className="shortcut-item" variants={fadeInUp}><kbd>Esc</kbd> <span>Exit Fullscreen / Overlays</span></motion.div>
        </motion.div>
      </section>

      {/* Quick Discovery CTA Banner */}
      <section className="home-discovery-section" aria-label="Explore Screenloop">
        <motion.div className="discovery-banner" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <div className="discovery-content">
            <h3 className="discovery-title">Curious about the technical details?</h3>
            <p className="discovery-desc">
              Read about the encryption model, how peer-to-peer streaming works, and why there's no database.
            </p>
          </div>
          <div className="discovery-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/features')}
            >
              Explore Features <ArrowRight size={14} />
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/security')}
            >
              <ShieldCheck size={16} /> Security Whitepaper
            </button>
          </div>
        </motion.div>
      </section>

      <SiteFooter />
    </motion.div>
  );
}
