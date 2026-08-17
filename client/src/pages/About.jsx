// About.jsx — About page with features, architecture, and tech stack
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SiteHeader, SiteFooter } from '../components';
import { staggerContainer, fadeInUp } from '../hooks/useScrollReveal';
import {
  FilmStrip, LockSimple, Lightning, Users, MonitorPlay, ShieldCheck,
  RocketLaunch, ChartBar, GithubLogo, ArrowRight, Sparkle
} from '../components/icons';
import { generateRoomId, generateRoomKey } from '../utils';

const features = [
  {
    icon: <LockSimple size={28} weight="duotone" />,
    title: 'End-to-End Encrypted',
    desc: 'AES-256-GCM encryption. Your messages stay private — not even our servers can read them.',
  },
  {
    icon: <MonitorPlay size={28} weight="duotone" />,
    title: 'Peer-to-Peer Mesh',
    desc: 'WebRTC direct connections between viewers — zero central server video buffering or lag.',
  },
  {
    icon: <Users size={28} weight="duotone" />,
    title: 'Zero Sign-Up Required',
    desc: "No accounts, no email databases, no tracking. Create a room and share the link. That's it.",
  },
  {
    icon: <Lightning size={28} weight="duotone" />,
    title: 'Pure Web Browser Native',
    desc: 'Works in Chrome, Edge, Safari, and Firefox. No downloads, no plugins, no desktop software needed.',
  },
  {
    icon: <ShieldCheck size={28} weight="duotone" />,
    title: 'PIN Protection & Moderation',
    desc: 'Optional room PINs with brute-force protection and host moderation controls (Kick & Host Transfer).',
  },
  {
    icon: <ChartBar size={28} weight="duotone" />,
    title: 'Real-Time Sync & Annotations',
    desc: 'Drawing highlighters, laser pointer, and chat synced synchronously across all participants.',
  },
];

const techStack = [
  { name: 'React 18', role: 'Frontend UI Framework' },
  { name: 'Vite 5', role: 'Next-Gen Build Tool' },
  { name: 'WebRTC P2P', role: 'Mesh Screen & Audio Streaming' },
  { name: 'Socket.io 4', role: 'Signaling & State Relay' },
  { name: 'Web Crypto API', role: 'Hardware-Accelerated AES-GCM' },
  { name: 'Node & Express', role: 'Signaling Control Plane' },
];

export default function About() {
  const navigate = useNavigate();
  const [isLaunching, setIsLaunching] = useState(false);

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

      <main className="about-page-content">
        <motion.div
          className="about-container"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Hero */}
          <motion.section className="page-hero" variants={fadeInUp}>
            <div className="hero-pill">
              <Sparkle size={14} className="pill-icon" />
              <span>Open Source • Privacy-First Media Synchronization</span>
            </div>
            <h1 className="page-hero-title">
              Watch together, <span className="text-gradient">privately.</span>
            </h1>
            <p className="page-hero-subtitle">
              Screenloop was created to bring back the pure joy of watching movies, tutorials, and streams with friends — without intrusive accounts, platform fees, or tracking.
            </p>
          </motion.section>

          {/* Features Grid */}
          <motion.section className="about-section" variants={fadeInUp}>
            <div className="section-header-centered">
              <span className="section-eyebrow">Core Philosophy</span>
              <h2 className="section-title">Why Screenloop Exists</h2>
            </div>
            <div className="about-features-grid">
              {features.map((f, i) => (
                <motion.div
                  key={i}
                  className="about-feature-card"
                  variants={fadeInUp}
                  whileHover={{ y: -3 }}
                >
                  <div className="about-feature-icon">{f.icon}</div>
                  <h3 className="about-feature-title">{f.title}</h3>
                  <p className="about-feature-desc">{f.desc}</p>
                </motion.div>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: 'var(--space-6)' }}>
              <Link to="/features" className="btn btn-secondary btn-sm">
                Explore Full Features Matrix <ArrowRight size={14} />
              </Link>
            </div>
          </motion.section>

          {/* Architecture */}
          <motion.section className="about-section" variants={fadeInUp}>
            <div className="section-header-centered">
              <span className="section-eyebrow">Architecture</span>
              <h2 className="section-title">How It Works</h2>
            </div>
            <div className="about-architecture">
              <div className="about-arch-step">
                <div className="about-arch-number">1</div>
                <div>
                  <h4>Create a Room</h4>
                  <p>Generate a secure room with a 256-bit AES encryption key embedded in the URL hash fragment (#key).</p>
                </div>
              </div>
              <div className="about-arch-step">
                <div className="about-arch-number">2</div>
                <div>
                  <h4>Share the Link</h4>
                  <p>Send the room link to friends. Browsers never transmit hash fragments to web servers, ensuring zero data leakage.</p>
                </div>
              </div>
              <div className="about-arch-step">
                <div className="about-arch-number">3</div>
                <div>
                  <h4>Stream Peer-to-Peer</h4>
                  <p>The host shares their screen directly with viewers over WebRTC with uncompressed 48kHz audio and sub-second latency.</p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Tech Stack */}
          <motion.section className="about-section" variants={fadeInUp}>
            <div className="section-header-centered">
              <span className="section-eyebrow">Engineering</span>
              <h2 className="section-title">Modern Web Tech Stack</h2>
            </div>
            <div className="about-tech-grid">
              {techStack.map((t, i) => (
                <div key={i} className="about-tech-card">
                  <span className="about-tech-name">{t.name}</span>
                  <span className="about-tech-role">{t.role}</span>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Open Source & CTA */}
          <motion.section className="page-cta-banner" variants={fadeInUp}>
            <div className="cta-banner-content">
              <h2 className="cta-title">Join the Open Source Movement</h2>
              <p className="cta-subtitle">
                Screenloop is free and licensed under MIT. Check out the source code, open issues, or contribute on GitHub.
              </p>
              <div className="cta-btn-group">
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={handleLaunch}
                  disabled={isLaunching}
                >
                  <RocketLaunch size={18} /> {isLaunching ? 'Launching…' : 'Start a Room Now'}
                </button>
                <a
                  href="https://github.com/Himanshusingh204/ScreenLoop"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-lg"
                >
                  <GithubLogo size={18} /> View on GitHub
                </a>
              </div>
            </div>
          </motion.section>
        </motion.div>
      </main>

      <SiteFooter />
    </div>
  );
}
