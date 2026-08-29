// About.jsx — Architecture, mission, and open-source foundation of Screenloop Pro
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SiteHeader, SiteFooter } from '../components';
import { staggerContainer, fadeInUp } from '../hooks/useScrollReveal';
import {
  FilmStrip, LockSimple, Lightning, Users, MonitorPlay, ShieldCheck,
  RocketLaunch, ChartBar, GithubLogo, ArrowRight, SpeakerSimpleHigh
} from '../components/icons';

const TECH_SPECS = [
  { name: 'WebRTC P2P', category: 'Streaming', detail: 'Direct browser-to-browser video and audio — no server relay' },
  { name: 'Web Audio API', category: 'Audio', detail: 'Echo cancellation disabled, optional volume booster' },
  { name: 'Web Crypto API', category: 'Encryption', detail: 'AES-GCM 256-bit chat encryption in the browser' },
  { name: 'React 18 + Vite', category: 'Frontend', detail: 'Client-side rendering with Framer Motion animations' },
  { name: 'Socket.io 4', category: 'Signaling', detail: 'In-memory connection handshake relay with rate limiting' },
  { name: 'CSS Variables', category: 'Design', detail: 'Custom theming system — no UI framework dependencies' },
];

export default function About() {
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
          {/* Hero Section */}
          <motion.section className="about-hero" variants={fadeInUp}>
            <span className="about-eyebrow">About the Project</span>
            <h1 className="about-hero-title">
              Built for real movie sync, <br />
              <span className="about-hero-accent">not boardroom meetings.</span>
            </h1>
            <p className="about-hero-subtitle">
              Screenloop is an open-source, peer-to-peer watch party app built around audio quality, privacy, and the fact that nobody wants to create another account.
            </p>
          </motion.section>

          {/* Mission & Philosophy */}
          <motion.section className="about-story-section" variants={fadeInUp}>
            <div className="about-story-card">
              <h2 className="about-section-heading">Why We Built Screenloop</h2>
              <div className="about-story-text">
                <p>
                  Most screen-sharing tools are designed for work calls and slide decks. They aggressively compress audio with voice-isolation filters, choke video framerates, force everyone to register accounts, and route video feeds through centralized corporate servers.
                </p>
                <p>
                  We wanted something radically better for watching films and live content with friends:
                </p>
                <ul className="about-story-points">
                  <li>
                    <strong>Audio that doesn't destroy movies:</strong> Disabling echo cancellation so film scores and surround mixes come through the way they were mixed.
                  </li>
                  <li>
                    <strong>True peer-to-peer:</strong> Direct WebRTC transport — no server stores or inspects your screen.
                  </li>
                  <li>
                    <strong>Encrypted chat:</strong> AES-GCM encryption with room keys stored in the URL hash fragment (<code>#key</code>), so even the server can't read messages.
                  </li>
                  <li>
                    <strong>No signups, no downloads:</strong> Just open a link in your browser and press play.
                  </li>
                </ul>
              </div>
            </div>
          </motion.section>

          {/* How It Works / Architecture */}
          <motion.section className="about-arch-section" variants={fadeInUp}>
            <div className="section-header-centered">
              <span className="section-eyebrow">How It Works</span>
              <h2 className="section-title">Peer-to-Peer Architecture</h2>
              <p className="section-desc">
                The server helps devices find each other. After that, everything flows directly between browsers.
              </p>
            </div>

            <div className="about-arch-grid">
              <div className="arch-step-card">
                <div className="arch-step-number">01</div>
                <h3 className="arch-step-title">Room Key Generation</h3>
                <p className="arch-step-desc">
                  The host browser generates a 256-bit AES-GCM key via the Web Crypto API. This key is placed in the URL hash fragment (<code>#key</code>), which browsers never send over HTTP.
                </p>
              </div>

              <div className="arch-step-card">
                <div className="arch-step-number">02</div>
                <h3 className="arch-step-title">Signaling Server</h3>
                <p className="arch-step-desc">
                  When viewers click the link, the Node.js server helps set up WebRTC connections by relaying SDP offers, answers, and ICE candidates in memory. No video or audio touches the server.
                </p>
              </div>

              <div className="arch-step-card">
                <div className="arch-step-number">03</div>
                <h3 className="arch-step-title">Direct P2P Streaming</h3>
                <p className="arch-step-desc">
                  Once connected, video and audio flow directly between viewers over encrypted WebRTC channels. No server relay, no buffering through a central point.
                </p>
              </div>
            </div>
          </motion.section>

          {/* Technical Specifications */}
          <motion.section className="about-specs-section" variants={fadeInUp}>
            <div className="section-header-centered">
              <span className="section-eyebrow">Tech Stack</span>
              <h2 className="section-title">Built with Web Standards</h2>
            </div>

            <div className="about-specs-grid">
              {TECH_SPECS.map((spec, idx) => (
                <div key={idx} className="spec-item-card">
                  <div className="spec-header">
                    <span className="spec-name">{spec.name}</span>
                    <span className="spec-category">{spec.category}</span>
                  </div>
                  <p className="spec-detail">{spec.detail}</p>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Open Source Card */}
          <motion.section className="about-oss-section" variants={fadeInUp}>
            <div className="about-oss-card">
              <div className="oss-icon-box">
                <GithubLogo size={32} />
              </div>
              <div className="oss-content">
                <h3 className="oss-title">Open Source (MIT License)</h3>
                <p className="oss-desc">
                  You can read every line of the encryption and signaling code on GitHub. Fork it, self-host it, or just poke around.
                </p>
                <div className="oss-actions">
                  <a
                    href="https://github.com/Himanshusingh204/ScreenLoop"
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                  >
                    <GithubLogo size={16} /> View GitHub Repository
                  </a>
                  <Link to="/features" className="btn btn-ghost btn-sm">
                    Explore All Features <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </motion.section>
        </motion.div>
      </main>

      <SiteFooter />
    </div>
  );
}
