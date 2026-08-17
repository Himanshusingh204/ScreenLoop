// Privacy.jsx — Transparent privacy policy and zero-knowledge data architecture
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SiteHeader, SiteFooter } from '../components';
import { staggerContainer, fadeInUp } from '../hooks/useScrollReveal';
import { LockSimple, ShieldCheck, EyeSlash, ArrowRight, GithubLogo } from '../components/icons';

export default function Privacy() {
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
              <span>Zero-Storage & Zero-Tracking Architecture</span>
            </div>
            <h1 className="page-hero-title">Privacy Policy</h1>
            <p className="page-hero-subtitle">
              Last updated: August 2026. Screenloop is engineered so that your viewing sessions and conversations remain private by mathematical construction.
            </p>
          </motion.section>

          {/* Policy Content Card */}
          <motion.div className="legal-content-card" variants={fadeInUp}>
            <section className="legal-section">
              <h2>1. Overview & Core Principle</h2>
              <p>
                Screenloop was created on a simple premise: <strong>We cannot leak or sell what we do not have.</strong> Unlike traditional watch party and videoconferencing platforms that log user accounts, monitor viewing habits, and proxy video files through cloud servers, Screenloop operates on a decentralized, peer-to-peer model.
              </p>
            </section>

            <section className="legal-section">
              <h2>2. Data We Do NOT Collect</h2>
              <ul>
                <li><strong>No Personal Identifiers:</strong> We do not ask for or collect names, email addresses, phone numbers, or passwords.</li>
                <li><strong>No Chat Logs:</strong> Chat messages are encrypted in your browser using AES-GCM 256-bit keys and are never stored in any database.</li>
                <li><strong>No Video / Screen Recording Storage:</strong> Video frames and cinema audio flow directly between users via WebRTC mesh channels without passing through server disk storage.</li>
                <li><strong>No Tracking Cookies or Analytics:</strong> We do not load Google Analytics, Meta Pixels, ad trackers, or third-party behavioral scripts.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>3. End-to-End Encryption & Hash Fragments</h2>
              <p>
                Each watch room is assigned a 256-bit symmetric encryption key generated locally with the browser's native <code>window.crypto.subtle</code> API. The key is stored solely in the URL hash fragment (<code>#key</code>).
              </p>
              <p>
                Under web standards (RFC 3986), browsers never transmit URL hash fragments in HTTP requests. As a result, our web servers only see the room identifier and never possess the cryptographic key required to decipher chat payloads.
              </p>
              <div style={{ marginTop: 'var(--space-3)' }}>
                <Link to="/security" className="card-inline-link">
                  Read the full Security & Cryptography Whitepaper →
                </Link>
              </div>
            </section>

            <section className="legal-section">
              <h2>4. WebRTC Peer-to-Peer Connections</h2>
              <p>
                When screen sharing is active, media packets travel over encrypted DTLS-SRTP peer-to-peer connections directly between participants. Our signaling server assists only in the initial WebRTC handshake (SDP offers/answers and ICE candidate exchange) and does not inspect media payloads.
              </p>
            </section>

            <section className="legal-section">
              <h2>5. Ephemeral In-Memory Server State</h2>
              <p>
                Active room references exist purely in the signaling server's RAM. When the host leaves or the watch party ends, the room and its associated session data are instantly purged from memory.
              </p>
            </section>

            <section className="legal-section">
              <h2>6. Open Source Transparency</h2>
              <p>
                We believe in verifiable privacy over corporate promises. All code powering Screenloop is public and auditable on GitHub under the MIT License.
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
            </section>
          </motion.div>
        </motion.div>
      </main>

      <SiteFooter />
    </div>
  );
}
