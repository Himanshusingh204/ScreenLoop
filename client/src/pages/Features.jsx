// Features.jsx — Technical feature showcase for Screenloop Pro
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SiteHeader, SiteFooter } from '../components';
import {
  FilmStrip, MonitorPlay, SpeakerSimpleHigh, LockSimple, PaintBrush,
  ChartBar, QrCode, Lightning, Users, ShieldCheck, Check,
  RocketLaunch, PictureInPicture
} from '../components/icons';
import { staggerContainer, fadeInUp } from '../hooks/useScrollReveal';
import { generateRoomId, generateRoomKey } from '../utils';

const CATEGORIES = [
  { id: 'all', label: 'All Capabilities' },
  { id: 'media', label: 'Streaming & Audio' },
  { id: 'security', label: 'Privacy & Security' },
  { id: 'interactive', label: 'Interactive Tools' },
];

const FEATURES = [
  {
    category: 'media',
    icon: <SpeakerSimpleHigh size={30} weight="duotone" />,
    badge: 'Audio Pipeline',
    title: '48 kHz Uncompressed Cinema Audio',
    desc: 'Voice isolation filters and aggressive noise gates are disabled to preserve full dynamic range for movies, background film scores, and delicate audio details.',
    specs: ['48,000 Hz Stereo', 'Dynamic Range Compression', 'Dialogue Gain Booster'],
  },
  {
    category: 'media',
    icon: <MonitorPlay size={30} weight="duotone" />,
    badge: 'WebRTC P2P',
    title: 'Direct Mesh Screen Sharing (1440p / 60fps)',
    desc: 'Video frames travel directly between browsers via peer-to-peer WebRTC connections. Eliminates central relay server congestion and video buffering.',
    specs: ['Up to 1440p 2K 60fps', 'Adaptive Bitrate Controller', 'Sub-150ms Glass Latency'],
  },
  {
    category: 'security',
    icon: <LockSimple size={30} weight="duotone" />,
    badge: 'Cryptography',
    title: 'AES-GCM 256-Bit End-to-End Encryption',
    desc: 'Chat messages are encrypted client-side using the Web Crypto API. Encryption keys reside in the URL hash fragment (#key) and are never sent over HTTP.',
    specs: ['AES-256-GCM Cypher', 'Zero Server Plaintext', 'Hash-Fragment Isolation'],
  },
  {
    category: 'interactive',
    icon: <PaintBrush size={30} weight="duotone" />,
    badge: 'Annotations',
    title: 'Synchronized Screen Drawing & Laser Pointer',
    desc: 'Annotate the live stream in real-time with customizable highlighters, pen strokes, and neon laser pointer tracking without disrupting video playback.',
    specs: ['Real-Time Canvas Sync', 'Laser Pointer Overlay', 'Non-Destructive UI'],
  },
  {
    category: 'interactive',
    icon: <Users size={30} weight="duotone" />,
    badge: 'Avatars',
    title: 'Dynamic Gender-Tailored Avatars',
    desc: 'Select your preferred avatar style upon joining (Female, Male, or Neutral) to render deterministic, illustrated avatars powered by the DiceBear API.',
    specs: ['DiceBear SVG Engine', 'Deterministic Name Seeds', 'No Accounts Required'],
  },
  {
    category: 'interactive',
    icon: <ChartBar size={30} weight="duotone" />,
    badge: 'Diagnostics',
    title: 'Live Telemetry HUD',
    desc: 'Inspect connection quality at a glance. Track live FPS, incoming bitrate in kbps, packet loss percentage, and round-trip ping time in real time.',
    specs: ['WebRTC getStats Telemetry', 'FPS & Bitrate Gauge', 'Link Health Status'],
  },
  {
    category: 'security',
    icon: <ShieldCheck size={30} weight="duotone" />,
    badge: 'Access Control',
    title: 'PIN Protection & Anti-Brute-Force',
    desc: 'Protect private watch parties with optional room passwords. Integrated sliding-window rate limiters automatically mitigate brute-force attempts and socket spam.',
    specs: ['PIN Hash Matching', 'IP Sliding-Window Rate Limit', 'Host Moderation Kick'],
  },
  {
    category: 'media',
    icon: <QrCode size={30} weight="duotone" />,
    badge: 'Mobile Joining',
    title: '1-Tap Local QR Code Generation',
    desc: 'Invite mobile viewers with QR codes rendered locally on HTML5 Canvas. No third-party image API is contacted, ensuring room keys remain completely private.',
    specs: ['HTML5 Canvas Rendering', 'Native Web Share API', 'Zero Data Leakage'],
  },
  {
    category: 'media',
    icon: <PictureInPicture size={30} weight="duotone" />,
    badge: 'Playback',
    title: 'Picture-in-Picture & Fullscreen Cinema',
    desc: 'Pop the stream out into a floating Picture-in-Picture window or trigger fullscreen cinema mode with auto-hiding controls and Screen Wake Lock.',
    specs: ['HTML5 PiP Standard', 'Screen Wake Lock API', 'Keyboard Shortcut (F)'],
  },
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
          {/* Hero */}
          <motion.section className="page-hero" variants={fadeInUp}>
            <span className="about-eyebrow">Technical Overview</span>
            <h1 className="page-hero-title">
              Engineered for <span className="text-gradient">Pure Media Sync</span>
            </h1>
            <p className="page-hero-subtitle">
              Detailed technical breakdown of Screenloop's peer-to-peer transport, audio dynamic range compression, and end-to-end encryption.
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
                whileHover={{ y: -3 }}
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

          {/* Quick Launch CTA */}
          <motion.section className="page-cta-banner" variants={fadeInUp}>
            <div className="cta-banner-content">
              <h2 className="cta-title">Ready to stream with friends?</h2>
              <p className="cta-subtitle">
                No accounts or credit cards required. Create an encrypted room in seconds.
              </p>
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={handleLaunch}
                disabled={isLaunching}
              >
                <RocketLaunch size={18} /> {isLaunching ? 'Preparing Room…' : 'Launch Watch Room'}
              </button>
            </div>
          </motion.section>
        </motion.div>
      </main>

      <SiteFooter />
    </div>
  );
}
