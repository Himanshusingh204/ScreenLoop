// Privacy.jsx — Transparent privacy policy and zero-knowledge data architecture
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SiteHeader, SiteFooter } from '../components';
import { staggerContainer, fadeInUp } from '../hooks/useScrollReveal';
import { LockSimple, ShieldCheck, EyeSlash, ArrowRight, GithubLogo } from '../components/icons';

const privacySections = [
  {
    icon: <EyeSlash size={20} />,
    title: '1. Overview & Core Principle',
    content: (
      <p>
        Screenloop was built around a simple constraint: <strong>if we don't store it, we can't leak or sell it.</strong> Unlike platforms that keep accounts, viewing histories, and server-side video proxies, Screenloop routes everything peer-to-peer and stores nothing on disk.
      </p>
    ),
  },
  {
    icon: <LockSimple size={20} />,
    title: '2. Data We Do NOT Collect',
    content: (
      <ul>
        <li><strong>No personal identifiers:</strong> No names, emails, phone numbers, or passwords.</li>
        <li><strong>No chat logs:</strong> Messages are encrypted in your browser. They never exist in plaintext on any server.</li>
        <li><strong>No video or audio recordings:</strong> Streams flow directly between users via WebRTC. Nothing passes through server storage.</li>
        <li><strong>No tracking or analytics:</strong> No Google Analytics, no Meta Pixels, no third-party scripts of any kind.</li>
      </ul>
    ),
  },
  {
    icon: <ShieldCheck size={20} />,
    title: '3. End-to-End Encryption & Hash Fragments',
    content: (
      <>
        <p>
          Each room has a 256-bit AES-GCM encryption key, generated in the host's browser using <code>window.crypto.subtle</code>. The key is appended to the URL as a hash fragment (<code>#key</code>).
        </p>
        <p>
          Per RFC 3986, browsers never send hash fragments in HTTP requests. The server only sees the room ID and never has access to the decryption key.
        </p>
        <div style={{ marginTop: 'var(--space-3)' }}>
          <Link to="/security" className="card-inline-link">
            Read the full Security & Cryptography Whitepaper →
          </Link>
        </div>
      </>
    ),
  },
  {
    icon: <ArrowRight size={20} />,
    title: '4. WebRTC Peer-to-Peer Connections',
    content: (
      <p>
        When you share your screen, media packets travel over encrypted peer-to-peer connections directly between participants. The signaling server helps set up the initial connection (SDP offers/answers and ICE candidates) but never sees the video or audio content.
      </p>
    ),
  },
  {
    icon: <LockSimple size={20} />,
    title: '5. Ephemeral Server State',
    content: (
      <p>
        Room data lives only in the signaling server's RAM. When the host leaves or the room ends, everything is deleted from memory immediately.
      </p>
    ),
  },
  {
    icon: <GithubLogo size={20} />,
    title: '6. Open Source',
    content: (
      <>
        <p>
          All code is public on GitHub under the MIT License. If you want to verify any of the above, you can read the source yourself.
        </p>
        <div style={{ marginTop: 'var(--space-4)' }}>
          <a
            href="https://github.com/Himanshusingh204/ScreenLoop"
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary btn-sm"
          >
            <GithubLogo size={16} /> View Screenloop Source Code on GitHub
          </a>
        </div>
      </>
    ),
  },
];

export default function Privacy() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div className="page-wrapper">
      <SiteHeader />

      <main className="legal-page-content">
        <motion.div
          className="legal-container"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.section className="page-hero" variants={fadeInUp}>
            <div className="hero-pill">
              <EyeSlash size={14} className="pill-icon" />
              <span>No Database, No Logs, No Tracking</span>
            </div>
            <h1 className="page-hero-title">Privacy Policy</h1>
            <p className="page-hero-subtitle">
              Last updated: August 2026. Screenloop doesn't collect personal data because the architecture doesn't require it.
            </p>
          </motion.section>

          {/* Expandable Privacy Cards */}
          <motion.div className="privacy-expandable-list" variants={staggerContainer}>
            {privacySections.map((section, i) => (
              <motion.div
                key={i}
                className={`privacy-expandable-card glass-card ${openIndex === i ? 'open' : ''}`}
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                variants={fadeInUp}
              >
                <div className="privacy-expandable-header">
                  <div className="privacy-expandable-left">
                    <div className="privacy-expandable-icon">{section.icon}</div>
                    <span className="privacy-expandable-title">{section.title}</span>
                  </div>
                  <span className="privacy-expandable-chevron">▾</span>
                </div>
                <div className="privacy-expandable-body">
                  <div className="privacy-expandable-content">{section.content}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </main>

      <SiteFooter />
    </div>
  );
}
