// Accessibility.jsx — Accessibility statement page (legal-style layout, matches Privacy/Terms)
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SiteHeader, SiteFooter } from '../components';
import { staggerContainer, fadeInUp } from '../hooks/useScrollReveal';
import { Sparkle, RocketLaunch } from '../components/icons';

export default function Accessibility() {
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
          {/* Hero */}
          <motion.section className="page-hero" variants={fadeInUp}>
            <h1 className="page-hero-title">Accessibility Statement</h1>
            <p className="page-hero-subtitle">
              Screenloop aims to be usable by everyone. We follow WCAG 2.1 Level AA
              as a working target and treat accessibility as an ongoing process.
            </p>
          </motion.section>

          <motion.div className="legal-content-card" variants={fadeInUp}>
            <div className="legal-section">
              <h2>Our Commitment</h2>
              <p>
                We believe watching together should not leave anyone out. That means
                accessible keyboard control, screen-reader support, high-contrast
                themes, and reduced-motion options — built in from the start and
                improved with every release.
              </p>
            </div>

            <div className="legal-section">
              <h2>What We&apos;ve Built So Far</h2>
              <ul>
                <li>Full keyboard navigation with documented shortcuts (e.g. <b>F</b> for fullscreen, <b>Esc</b> to close)</li>
                <li>Semantic HTML and ARIA labels on buttons, dialogs, and the navigation</li>
                <li>Screen-reader announcements for toasts and live chat events</li>
                <li>Five high-contrast color themes, all configurable without reloading</li>
                <li><code>prefers-reduced-motion</code> support so animations are minimized for motion sensitivity</li>
                <li>Focus states that stay clearly visible on every interactive element</li>
              </ul>
            </div>

            <div className="legal-section">
              <h2>Known Limitations</h2>
              <p>
                Accessibility is an evolving area of this project. Some in-room
                overlays and annotation tools are still being brought up to WCAG AA
                as part of our current roadmap.
              </p>
            </div>

            <div className="legal-section">
              <h2>Feedback</h2>
              <p>
                If you encounter a barrier while using Screenloop — or want to
                suggest an improvement — please open a GitHub issue. Accessibility
                reports are treated as a top priority.
              </p>
              <p>
                <a
                  href="https://github.com/Himanshusingh204/ScreenLoop/issues"
                  target="_blank"
                  rel="noreferrer"
                  className="card-inline-link"
                >
                  Report an accessibility issue →
                </a>
              </p>
            </div>

            <div className="legal-section">
              <h2>Last Updated</h2>
              <p>August 20, 2026</p>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.section className="help-section" variants={fadeInUp}>
            <div className="section-header-centered">
              <h2 className="section-title">Have feedback on accessibility?</h2>
              <p className="section-desc">
                Accessibility reports are treated as high priority on the roadmap.
              </p>
              <a
                href="https://github.com/Himanshusingh204/ScreenLoop/issues"
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ marginTop: 'var(--space-3)' }}
              >
                Open an Issue
              </a>
            </div>
          </motion.section>
        </motion.div>
      </main>

      <SiteFooter />
    </div>
  );
}