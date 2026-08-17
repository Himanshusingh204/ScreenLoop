// Features.jsx — Deep-dive feature showcase & comparison matrix
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SiteHeader, SiteFooter } from '../components';
import {
  FilmStrip, MonitorPlay, SpeakerSimpleHigh, LockSimple, PaintBrush,
  ChartBar, QrCode, Sparkle, Lightning, Users, ShieldCheck, Check,
  RocketLaunch, PictureInPicture, CornersOut, Cursor
} from '../components/icons';
import { staggerContainer, fadeInUp } from '../hooks/useScrollReveal';
import { generateRoomId, generateRoomKey } from '../utils';

const CATEGORIES = [
  { id: 'all', label: 'All Features' },
  { id: 'media', label: 'Streaming & Audio' },
  { id: 'security', label: 'Privacy & Security' },
  { id: 'interactive', label: 'Interactive Tools' },
];

const FEATURES = [
  {
    category: 'media',
    icon: <SpeakerSimpleHigh size={32} weight="duotone" />,
    badge: 'Audio Engineering',
    title: '48 kHz Uncompressed Cinema Audio',
    desc: 'Echo cancellation and aggressive noise suppression are explicitly disabled. Full dynamic audio range is preserved for explosive movie soundtracks, concerts, and rich dialogue.',
    specs: ['48,000 Hz Stereo', 'Dynamic Range Compressor', 'Built-in Dialogue Booster'],
  },
  {
    category: 'media',
    icon: <MonitorPlay size={32} weight="duotone" />,
    badge: 'WebRTC P2P',
    title: 'Direct Mesh Screen Streaming (1440p / 60fps)',
    desc: 'Video and audio pixels travel directly from the host to viewers over high-speed peer-to-peer WebRTC connections. No relay servers causing artificial lag or bitrate starvation.',
    specs: ['Up to 1440p 2K', 'Adaptive Quality Switcher', 'Sub-150ms Glass-to-Glass Latency'],
  },
  {
    category: 'security',
    icon: <LockSimple size={32} weight="duotone" />,
    badge: 'Cryptography',
    title: 'AES-GCM 256-Bit End-to-End Encryption',
    desc: 'Chat messages are encrypted client-side using the browser Web Crypto API. The symmetric encryption key is embedded only in the URL hash fragment (#key), which web servers never receive.',
    specs: ['AES-256-GCM Cypher', 'Zero Server Plaintext', 'Hash-Fragment Secret Transport'],
  },
  {
    category: 'interactive',
    icon: <PaintBrush size={32} weight="duotone" />,
    badge: 'Collaboration',
    title: 'Live Screen Annotations & Laser Pointer',
    desc: 'Draw over the stream in real-time with customizable highlighters, pen strokes, and neon laser pointers. Viewers can react and interact synchronously without obscuring the video.',
    specs: ['Real-Time Canvas Sync', 'Laser Pointer Tracking', 'Pressure-Sensitive Brushes'],
  },
  {
    category: 'interactive',
    icon: <Users size={32} weight="duotone" />,
    badge: 'Identity',
    title: 'Dynamic Gender-Tailored Avatars',
    desc: 'Choose your avatar style on room join (Female, Male, or Neutral) to automatically generate stylish, harmonious illustrated avatars powered by the DiceBear API.',
    specs: ['DiceBear SVG Rendering', 'Deterministic Color Seeds', 'No Profile Accounts Needed'],
  },
  {
    category: 'interactive',
    icon: <ChartBar size={32} weight="duotone" />,
    badge: 'Telemetry',
    title: 'Real-Time Diagnostic HUD',
    desc: 'Inspect stream health on the fly. Track live FPS, incoming bitrate in kbps, packet loss percentages, round-trip ping time, and audio buffer states with a single click.',
    specs: ['WebRTC getStats API', 'Live FPS & Bitrate Meter', 'Network Quality Indicator'],
  },
  {
    category: 'security',
    icon: <ShieldCheck size={32} weight="duotone" />,
    badge: 'Access Control',
    title: 'PIN Protection & Anti-Brute-Force',
    desc: 'Protect private watch parties with optional room PINs. Integrated sliding-window IP rate limiters automatically lock out brute-force attacks and socket spam.',
    specs: ['PIN Hash Authentication', 'IP Sliding-Window Throttling', 'Host Kick & Moderation'],
  },
  {
    category: 'media',
    icon: <QrCode size={32} weight="duotone" />,
    badge: 'Mobile Onboarding',
    title: '1-Tap Local QR Code Generation',
    desc: 'Invite mobile friends seamlessly with client-side rendered QR codes. No third-party QR API is contacted, ensuring your room link and encryption key never leak.',
    specs: ['Canvas Local Rendering', 'Native Web Share API', 'Zero Data Leakage'],
  },
  {
    category: 'media',
    icon: <PictureInPicture size={32} weight="duotone" />,
    badge: 'Playback',
    title: 'Picture-in-Picture & Fullscreen Cinema',
    desc: 'Pop out the stream into a floating Picture-in-Picture window or trigger cinema fullscreen mode with intelligent auto-hiding controls and background stage glow.',
    specs: ['HTML5 PiP API', 'Screen Wake Lock API', 'Keyboard Shortcut (F)'],
  },
];

const COMPARISON_DATA = [
  { feature: '48kHz Cinema Stereo Audio', screenloop: '✅ Full dynamic range', discord: '⚠️ Compressed voice-codec', zoom: '❌ Voice mono tuned', teleparty: '❌ Third-party plugin only' },
  { feature: 'Direct P2P (Zero Server Video Storage)', screenloop: '✅ 100% P2P mesh', discord: '❌ Server relayed', zoom: '❌ Server relayed', teleparty: '❌ Extension dependent' },
  { feature: 'End-to-End Chat Encryption (AES-256)', screenloop: '✅ Client-side #key', discord: '❌ Plaintext on server', zoom: '❌ Server managed', teleparty: '❌ Server stored' },
  { feature: 'Account or Software Install Required', screenloop: '✅ Zero sign-up / Pure web', discord: '❌ Account required', zoom: '❌ App required', teleparty: '❌ Chrome extension' },
  { feature: '1080p / 1440p 60fps Screen Sharing', screenloop: '✅ Free & unlimited', discord: '❌ Nitro paywall ($9.99/mo)', zoom: '❌ 720p capped', teleparty: '❌ Not supported' },
  { feature: 'Live Screen Drawing & Laser Pointer', screenloop: '✅ Included built-in', discord: '❌ Not available', zoom: '⚠️ Meeting only', teleparty: '❌ Not available' },
];

export default function Features() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [isLaunching, setIsLaunching] = useState(false);

  const filteredFeatures = activeCategory === 'all'
    ? FEATURES
    : FEATURES.filter((f) => f.category === activeCategory);

  const handleLaunch = async () => {
    try {
      setIsLaunching(true);
      const roomId = generateRoomId();
      const rawKey = await generateRoomKey();
      navigate(`/room/${roomId}?host=true${rawKey ? '#' + rawKey : ''}`, { state: { isCreator: true } });
    } catch (err) {
      console.error('Launch failed:', err);
      navigate('/');
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="page-wrapper">
      <SiteHeader />

      <main className="features-page-content">
        <motion.div
          className="features-container"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Hero Section */}
          <motion.section className="page-hero" variants={fadeInUp}>
            <div className="hero-pill">
              <Sparkle size={14} className="pill-icon" />
              <span>Engineered For Movie Enthusiasts & Streamers</span>
            </div>
            <h1 className="page-hero-title">
              Built for <span className="text-gradient">True Cinema Sync</span>
            </h1>
            <p className="page-hero-subtitle">
              Every detail in Screenloop is optimized for crystal-clear uncompressed sound, ultra-low latency WebRTC streaming, and total privacy without accounts.
            </p>
          </motion.section>

          {/* Category Filter */}
          <motion.div className="features-filter-bar" variants={fadeInUp}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`filter-btn ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </motion.div>

          {/* Features Grid */}
          <motion.div className="features-grid" variants={fadeInUp}>
            {filteredFeatures.map((feature, idx) => (
              <motion.div
                key={idx}
                className="feature-card-pro"
                variants={fadeInUp}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <div className="feature-card-header">
                  <div className="feature-icon-box">{feature.icon}</div>
                  <span className="feature-badge">{feature.badge}</span>
                </div>
                <h2 className="feature-card-title">{feature.title}</h2>
                <p className="feature-card-desc">{feature.desc}</p>
                <div className="feature-specs-list">
                  {feature.specs.map((spec, sIdx) => (
                    <span key={sIdx} className="spec-tag">
                      <Check size={12} weight="bold" /> {spec}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Comparison Matrix Section */}
          <motion.section id="comparison" className="comparison-section" variants={fadeInUp}>
            <div className="section-header-centered">
              <span className="section-eyebrow">Platform Matrix</span>
              <h2 className="section-title">How Screenloop Compares</h2>
              <p className="section-desc">
                Traditional tools compress audio for voice chats or force signups. Screenloop is built specifically for watching media together.
              </p>
            </div>

            <div className="comparison-table-wrapper">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th className="highlight-col">Screenloop Pro</th>
                    <th>Discord</th>
                    <th>Zoom</th>
                    <th>Teleparty</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_DATA.map((row, rIdx) => (
                    <tr key={rIdx}>
                      <td className="table-feature-name">{row.feature}</td>
                      <td className="highlight-col table-feature-val">{row.screenloop}</td>
                      <td className="table-feature-val">{row.discord}</td>
                      <td className="table-feature-val">{row.zoom}</td>
                      <td className="table-feature-val">{row.teleparty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.section>

          {/* Call to action */}
          <motion.section className="page-cta-banner" variants={fadeInUp}>
            <div className="cta-banner-content">
              <h2 className="cta-title">Experience cinema-grade sync today</h2>
              <p className="cta-subtitle">
                No downloads. No payment. Create a private watch room and invite your friends in seconds.
              </p>
              <button
                type="button"
                className="btn btn-primary btn-lg cta-action-btn"
                onClick={handleLaunch}
                disabled={isLaunching}
              >
                <RocketLaunch size={18} /> {isLaunching ? 'Preparing Room…' : 'Start Watch Party Free'}
              </button>
            </div>
          </motion.section>
        </motion.div>
      </main>

      <SiteFooter />
    </div>
  );
}
