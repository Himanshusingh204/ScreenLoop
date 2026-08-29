// Changelog.jsx — What's New page rendering the release history
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SiteHeader, SiteFooter } from '../components';
import { staggerContainer, fadeInUp } from '../hooks/useScrollReveal';
import { Sparkle, Check, RocketLaunch } from '../components/icons';
import { RELEASES } from '../data/changelog';

export default function Changelog() {
  return (
    <div className="page-wrapper">
      <SiteHeader />

      <main className="changelog-page-content">
        <motion.div
          className="changelog-container"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Hero */}
          <motion.section className="page-hero" variants={fadeInUp}>
            <div className="hero-pill">
              <Sparkle size={14} className="pill-icon" />
              <span>Release Notes</span>
            </div>
            <h1 className="page-hero-title">What&apos;s New in Screenloop</h1>
            <p className="page-hero-subtitle">
              Every release is a step toward smoother, more private watch parties.
              Here&apos;s the story so far.
            </p>
          </motion.section>

          {/* Releases */}
          {RELEASES.map((release) => (
            <motion.section key={release.version} className="changelog-entry" variants={fadeInUp}>
              <div className="changelog-entry-header">
                <div className="changelog-version-row">
                  <span className="changelog-version">{release.version}</span>
                  <span className="changelog-tag">{release.tag}</span>
                </div>
                <span className="changelog-date">{release.date}</span>
              </div>
              <p className="changelog-summary">{release.summary}</p>
              <ul className="changelog-list">
                {release.items.map((item) => (
                  <li key={item}>
                    <Check size={14} weight="bold" className="changelog-check" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.section>
          ))}

          {/* CTA */}
          <motion.section className="help-section" variants={fadeInUp}>
            <div className="section-header-centered">
              <h2 className="section-title">No updates to install</h2>
              <p className="section-desc">
                Screenloop always runs the latest version in your browser. Just share the link.
              </p>
              <Link to="/" className="btn btn-primary btn-sm" style={{ marginTop: 'var(--space-3)' }}>
                Launch a Room
              </Link>
            </div>
          </motion.section>
        </motion.div>
      </main>

      <SiteFooter />
    </div>
  );
}