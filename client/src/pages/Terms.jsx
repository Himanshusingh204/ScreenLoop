// Terms.jsx — Terms of Service & Acceptable Use Policy
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SiteHeader, SiteFooter } from '../components';
import { FileText, ShieldCheck, Scales } from '../components/icons';
import { staggerContainer, fadeInUp } from '../hooks/useScrollReveal';

export default function Terms() {
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
            <h1 className="page-hero-title">Terms of Service</h1>
            <p className="page-hero-subtitle">
              Last updated: August 2026. Please read these terms before using Screenloop.
            </p>
          </motion.section>

          {/* Terms Layout: TOC + Content */}
          <motion.div className="terms-layout" variants={fadeInUp}>
            <nav className="terms-toc">
              <a href="#section-1" className="terms-toc-link">1. Agreement to Terms</a>
              <a href="#section-2" className="terms-toc-link">2. Nature of the Service</a>
              <a href="#section-3" className="terms-toc-link">3. Acceptable Use Policy</a>
              <a href="#section-4" className="terms-toc-link">4. Intellectual Property</a>
              <a href="#section-5" className="terms-toc-link">5. Disclaimer</a>
              <a href="#section-6" className="terms-toc-link">6. Limitation of Liability</a>
              <a href="#section-7" className="terms-toc-link">7. Open Source</a>
            </nav>

            <div className="terms-content-area">
              <section className="terms-content-section" id="section-1">
                <div className="terms-section-number">01</div>
                <h2>1. Agreement to Terms</h2>
                <p>
                  By accessing or using the Screenloop web application, you agree to be bound by these Terms of Service. If you do not agree to all terms, you may not access or use the application.
                </p>
              </section>

              <section className="terms-content-section" id="section-2">
                <div className="terms-section-number">02</div>
                <h2>2. Nature of the Service</h2>
                <p>
                  Screenloop is an open-source, peer-to-peer (P2P) communication tool. Screenloop does not host, store, broadcast, or index any video files, movie files, audio recordings, or copyrighted media. All video and audio data is transmitted directly between users' web browsers via WebRTC.
                </p>
              </section>

              <section className="terms-content-section" id="section-3">
                <div className="terms-section-number">03</div>
                <h2>3. Acceptable Use Policy</h2>
                <p>You agree to use Screenloop only for lawful and private communication purposes. You strictly agree not to:</p>
                <ul>
                  <li>Stream or distribute content that violates any local, national, or international copyright, trademark, or intellectual property laws.</li>
                  <li>Share unauthorized pornographic, hateful, violent, or abusive material.</li>
                  <li>Engage in socket flooding, denial of service attacks, or malicious rate-limit bypasses against the signaling server.</li>
                  <li>Use automated bots or scripts to create or harvest watch room links.</li>
                </ul>
              </section>

              <section className="terms-content-section" id="section-4">
                <div className="terms-section-number">04</div>
                <h2>4. Intellectual Property & Copyright</h2>
                <p>
                  As the host of a watch party, you are solely and entirely responsible for any material you choose to share from your screen or audio output. Screenloop does not monitor, record, or filter peer-to-peer data streams.
                </p>
              </section>

              <section className="terms-content-section" id="section-5">
                <div className="terms-section-number">05</div>
                <h2>5. Disclaimer of Warranties</h2>
                <p>
                  Screenloop is provided on an <strong>"AS IS"</strong> and <strong>"AS AVAILABLE"</strong> basis without warranties of any kind, whether express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement.
                </p>
              </section>

              <section className="terms-content-section" id="section-6">
                <div className="terms-section-number">06</div>
                <h2>6. Limitation of Liability</h2>
                <p>
                  In no event shall the creators, contributors, or maintainers of Screenloop be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising out of your access to or use of the application.
                </p>
              </section>

              <section className="terms-content-section" id="section-7">
                <div className="terms-section-number">07</div>
                <h2>7. Open Source Licensing</h2>
                <p>
                  Screenloop is open-source software licensed under the <strong>MIT License</strong>. You are free to inspect, fork, and self-host the source code in accordance with the license conditions on our GitHub repository.
                </p>
              </section>
            </div>
          </motion.div>
        </motion.div>
      </main>

      <SiteFooter />
    </div>
  );
}
