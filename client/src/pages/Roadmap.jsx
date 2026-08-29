// Roadmap.jsx — Public roadmap page rendered from the roadmap data file
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SiteHeader, SiteFooter } from '../components';
import { staggerContainer, fadeInUp } from '../hooks/useScrollReveal';
import {
  ChatTeardropText, EyeSlash, Sparkle, GearSix, CheckFat,
  Clock, RocketLaunch, Check
} from '../components/icons';
import { ROADMAP_PHASES } from '../data/roadmap';

const PHASE_ICONS = {
  chat: <ChatTeardropText size={20} weight="duotone" />,
  a11y: <EyeSlash size={20} weight="duotone" />,
  polish: <Sparkle size={20} weight="duotone" />,
  server: <GearSix size={20} weight="duotone" />,
};

export default function Roadmap() {
  const totalItems = ROADMAP_PHASES.reduce((sum, p) => sum + p.items.length, 0);
  const doneItems = ROADMAP_PHASES.reduce(
    (sum, p) => sum + p.items.filter((i) => i.status === 'done').length,
    0
  );
  const plannedItems = totalItems - doneItems;
  const donePercent = Math.round((doneItems / totalItems) * 100);

  return (
    <div className="page-wrapper">
      <SiteHeader />

      <main className="roadmap-page-content">
        <motion.div
          className="roadmap-container"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Hero */}
          <motion.section className="page-hero" variants={fadeInUp}>
            <span className="about-eyebrow">Public Roadmap</span>
            <h1 className="page-hero-title">
              What&apos;s Being Worked On
            </h1>
            <p className="page-hero-subtitle">
              An open view of what's in progress, what shipped, and where
              your feedback helps most.
            </p>
          </motion.section>

          {/* Overview Stats */}
          <motion.div className="roadmap-overview" variants={fadeInUp}>
            <div className="roadmap-stat-card">
              <div className="roadmap-stat-value">
                <CheckFat size={18} /> {doneItems}
              </div>
              <div className="roadmap-stat-label">Shipped</div>
            </div>
            <div className="roadmap-stat-card">
              <div className="roadmap-stat-value">
                <Clock size={18} /> {plannedItems}
              </div>
              <div className="roadmap-stat-label">In Queue</div>
            </div>
            <div className="roadmap-stat-card">
              <div className="roadmap-stat-value">{ROADMAP_PHASES.length}</div>
              <div className="roadmap-stat-label">Focus Areas</div>
            </div>
            <div className="roadmap-stat-card">
              <div className="roadmap-stat-value">{donePercent}%</div>
              <div className="roadmap-stat-label">Complete</div>
            </div>
          </motion.div>

          {/* Phases */}
          {ROADMAP_PHASES.map((phase) => {
            const phaseDone = phase.items.filter((i) => i.status === 'done').length;
            const phasePercent = Math.round((phaseDone / phase.items.length) * 100);
            return (
              <motion.section key={phase.id} className="roadmap-phase" variants={fadeInUp}>
                <div className="roadmap-phase-header">
                  <h2 className="roadmap-phase-title">
                    <span className="roadmap-phase-icon">{PHASE_ICONS[phase.id]}</span>
                    {phase.title}
                  </h2>
                  <span className="roadmap-phase-meta">
                    {phaseDone}/{phase.items.length} done · {phasePercent}%
                  </span>
                </div>
                <p className="roadmap-phase-tagline">{phase.tagline}</p>

                <div
                  className="roadmap-progress-track"
                  role="img"
                  aria-label={`${phase.title}: ${phasePercent}% complete`}
                >
                  <div
                    className="roadmap-progress-fill"
                    style={{ width: `${phasePercent}%` }}
                  />
                </div>

                <ul className="roadmap-task-list">
                  {phase.items.map((item) => {
                    const done = item.status === 'done';
                    return (
                      <li key={item.title} className={`roadmap-task ${done ? 'done' : ''}`}>
                        <span className={`roadmap-task-marker ${done ? '' : 'pending'}`}>
                          <Check size={13} weight={done ? 'bold' : 'regular'} />
                        </span>
                        {item.title}
                      </li>
                    );
                  })}
                </ul>
              </motion.section>
            );
          })}

          {/* CTA */}
          <motion.section className="help-section" variants={fadeInUp}>
            <div className="section-header-centered">
              <h2 className="section-title">See something missing?</h2>
              <p className="section-desc">
                Feature requests are open on GitHub and directly shape the roadmap.
              </p>
              <Link to="/contact" className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--space-3)' }}>
                Suggest a Feature
              </Link>
            </div>
          </motion.section>
        </motion.div>
      </main>

      <SiteFooter />
    </div>
  );
}