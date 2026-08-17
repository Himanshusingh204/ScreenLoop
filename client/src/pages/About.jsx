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
  { name: 'WebRTC P2P', category: 'Media Plane', detail: 'Direct browser-to-browser mesh streaming up to 1440p 60fps' },
  { name: 'Web Audio API', category: 'Audio Pipeline', detail: '48 kHz uncompressed stereo with dynamic range compressor' },
  { name: 'Web Crypto API', category: 'Cryptography', detail: 'Hardware-accelerated AES-GCM 256-bit client-side encryption' },
  { name: 'React 18 & Vite', category: 'Frontend UI', detail: 'Fast virtual DOM rendering with Framer Motion animations' },
  { name: 'Socket.io 4', category: 'Control Plane', detail: 'Ephemeral in-memory signaling relay with sliding rate limits' },
  { name: 'Pure CSS Variables', category: 'Design System', detail: 'Zero heavyweight UI frameworks; 5 bespoke obsidian themes' },
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
              Screenloop is an open-source, peer-to-peer watch party platform engineered around sound fidelity, zero user tracking, and effortless browser streaming.
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
                    <strong>Uncompressed 48 kHz Cinema Sound:</strong> Disabling noise suppression so film scores and sound effects boom naturally.
                  </li>
                  <li>
                    <strong>True Peer-to-Peer Mesh:</strong> Direct WebRTC transport with no middleman server storing or analyzing your screen.
                  </li>
                  <li>
                    <strong>Client-Side Cryptography:</strong> 256-bit AES-GCM encryption with room keys stored exclusively in the URL hash fragment (<code>#key</code>), ensuring even the hosting server never sees plaintext messages.
                  </li>
                  <li>
                    <strong>Zero Friction:</strong> No signups, no downloads, no cookies, no tracking scripts. Just open a link and press play.
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
                Screenloop separates signaling from media transport to maximize privacy and eliminate buffering bottlenecks.
              </p>
            </div>

            <div className="about-arch-grid">
              <div className="arch-step-card">
                <div className="arch-step-number">01</div>
                <h3 className="arch-step-title">Room Key Generation</h3>
                <p className="arch-step-desc">
                  The host browser generates a 256-bit AES-GCM symmetric key via the Web Cryptography API. This key is placed in the URL hash fragment (<code>#key</code>), which browsers never send over HTTP.
                </p>
              </div>

              <div className="arch-step-card">
                <div className="arch-step-number">02</div>
                <h3 className="arch-step-title">Ephemeral Signaling</h3>
                <p className="arch-step-desc">
                  When viewers click the link, the lightweight Node.js server relays WebRTC SDP offers, answers, and ICE candidates in memory. No accounts or video data ever touch the server disk.
                </p>
              </div>

              <div className="arch-step-card">
                <div className="arch-step-number">03</div>
                <h3 className="arch-step-title">Direct P2P Streaming</h3>
                <p className="arch-step-desc">
                  Once connected, video and uncompressed audio packets flow directly between viewers via DTLS-SRTP encrypted mesh channels for sub-150ms glass-to-glass latency.
                </p>
              </div>
            </div>
          </motion.section>

          {/* Technical Specifications */}
          <motion.section className="about-specs-section" variants={fadeInUp}>
            <div className="section-header-centered">
              <span className="section-eyebrow">Technical Stack</span>
              <h2 className="section-title">Built with Modern Web Standards</h2>
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
                <h3 className="oss-title">100% Free & Open Source</h3>
                <p className="oss-desc">
                  Screenloop is released under the permissive <strong>MIT License</strong>. You are free to inspect the cryptographic implementation, fork the project, and self-host your own instance.
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
