// Security.jsx — Cryptography whitepaper & zero-knowledge security architecture
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SiteHeader, SiteFooter } from '../components';
import {
  LockSimple, ShieldCheck, Key, EyeSlash, Broadcast, FileText,
  CheckCircle, GithubLogo, FilmStrip, Sparkle, Lightning
} from '../components/icons';
import { staggerContainer, fadeInUp } from '../hooks/useScrollReveal';

const SECURITY_PILLARS = [
  {
    icon: <LockSimple size={28} weight="duotone" />,
    title: 'Client-Side Key Derivation',
    desc: 'The symmetric 256-bit AES-GCM key is generated directly inside the host browser using window.crypto.subtle. The key never leaves the client machine.',
  },
  {
    icon: <Key size={28} weight="duotone" />,
    title: 'Hash-Fragment Secret Transport',
    desc: 'The room encryption key is attached solely as a URL hash fragment (#key). According to RFC 3986, browsers never send the hash fragment to web servers.',
  },
  {
    icon: <Broadcast size={28} weight="duotone" />,
    title: 'DTLS-SRTP Mesh Media Streams',
    desc: 'All WebRTC screen and audio streams are encrypted via DTLS 1.2 (Datagram Transport Layer Security) and SRTP directly between viewer peers.',
  },
  {
    icon: <EyeSlash size={28} weight="duotone" />,
    title: 'Zero Media & Server Storage',
    desc: 'Screenloop has no database. Signaling state is held transiently in RAM and erased the moment a room ends or server instances recycle.',
  },
  {
    icon: <ShieldCheck size={28} weight="duotone" />,
    title: 'Sliding-Window Rate Limiting',
    desc: 'Anti-spam protection tracks request frequency across IP addresses and socket channels to block brute-force PIN attempts and flood attacks.',
  },
  {
    icon: <FileText size={28} weight="duotone" />,
    title: 'Auditable Open Source Code',
    desc: 'Every line of code powering the frontend encryption and backend signaling is public and auditable on GitHub under the permissive MIT license.',
  },
];

const CRYPTO_STEPS = [
  {
    step: '01',
    title: 'Host Launches Room',
    code: 'crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, ...)',
    desc: 'A cryptographically secure 256-bit symmetric encryption key is synthesized in host memory.',
  },
  {
    step: '02',
    title: 'URL Hash Embedding',
    code: 'https://screenloop.app/room/9CzpwqYu8v#8Fj3k9Lm2Aq9…',
    desc: 'The key is appended to the URL fragment (#). The web server only sees the room ID (/room/9CzpwqYu8v) and has no access to the decryption key.',
  },
  {
    step: '03',
    title: 'Encrypted Message Relay',
    code: 'crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, messageBytes)',
    desc: 'Each chat message is encrypted with a unique Initialization Vector (IV). The signaling server relays ciphertext payloads blindly.',
  },
  {
    step: '04',
    title: 'Local Decryption at Viewer',
    code: 'crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipherText)',
    desc: 'Invited friends holding the #key hash fragment decrypt messages locally in their browser. Untrusted interceptors see only ciphertext bytes.',
  },
];

export default function Security() {
  return (
    <div className="page-wrapper">
      <SiteHeader />

      <main className="security-page-content">
        <motion.div
          className="security-container"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Hero */}
          <motion.section className="page-hero" variants={fadeInUp}>
            <div className="hero-pill">
              <ShieldCheck size={14} className="pill-icon" />
              <span>Encryption & Privacy Details</span>
            </div>
            <h1 className="page-hero-title">
              How Security Works
            </h1>
            <p className="page-hero-subtitle">
              The short version: your chat is encrypted in the browser, the key lives in the URL, and the server never sees plaintext messages or video. Here's how that actually works.
            </p>
          </motion.section>

          {/* Security Pillars — Timeline Layout */}
          <motion.section className="security-pillars-section" variants={fadeInUp}>
            <div className="security-pillars-timeline">
              {SECURITY_PILLARS.map((pillar, idx) => (
                <motion.div key={idx} className="security-pillar-timeline-node" variants={fadeInUp}>
                  <div className="security-pillar-timeline-icon">{pillar.icon}</div>
                  <div className="security-pillar-timeline-content">
                    <h2 className="security-pillar-timeline-title">{pillar.title}</h2>
                    <p className="security-pillar-timeline-desc">{pillar.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Step-by-Step Cryptographic Flow — Timeline Layout */}
          <motion.section className="crypto-flow-section" variants={fadeInUp}>
            <div className="section-header-centered">
              <span className="section-eyebrow">Cryptographic Protocol</span>
              <h2 className="section-title">How End-to-End Encryption Works</h2>
              <p className="section-desc">
                Screenloop uses the browser's built-in Web Crypto API for encryption — no external crypto libraries, no server-side key handling.
              </p>
            </div>

            <div className="security-timeline">
              {CRYPTO_STEPS.map((step, idx) => (
                <motion.div key={idx} className="security-timeline-step glass-card" variants={fadeInUp}>
                  <div className="security-timeline-badge">{step.step}</div>
                  <h3 className="security-timeline-title">{step.title}</h3>
                  <p className="security-timeline-desc">{step.desc}</p>
                  <div className="security-timeline-code">
                    <code>{step.code}</code>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Security Guarantees & Verification */}
          <motion.section className="security-checklist-section" variants={fadeInUp}>
            <div className="checklist-card glass-card">
              <h2 className="checklist-title">What the Server Can and Can't Do</h2>
              <ul className="checklist-items">
                <li>
                  <CheckCircle size={20} className="check-icon" weight="fill" />
                  <span><strong>No account required:</strong> We never ask for an email, phone number, or password.</span>
                </li>
                <li>
                  <CheckCircle size={20} className="check-icon" weight="fill" />
                  <span><strong>No video storage:</strong> Screen and audio streams flow peer-to-peer. The server never sees them.</span>
                </li>
                <li>
                  <CheckCircle size={20} className="check-icon" weight="fill" />
                  <span><strong>No analytics or trackers:</strong> No Google Analytics, no Meta Pixels, no ad scripts.</span>
                </li>
                <li>
                  <CheckCircle size={20} className="check-icon" weight="fill" />
                  <span><strong>Local QR codes:</strong> QR codes are rendered in your browser, not fetched from a third-party service.</span>
                </li>
              </ul>
              <div className="checklist-footer">
                <a
                  href="https://github.com/Himanshusingh204/ScreenLoop"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm"
                >
                  <GithubLogo size={16} /> Audit Source Code on GitHub
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
