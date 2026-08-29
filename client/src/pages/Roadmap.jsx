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
  const doneCount = ROADMAP_PHASES.reduce(
    (sum, p) => sum + p.items.filter((i) => i.status === 'done').length,
    0
  );
  const plannedCount = totalItems - doneCount;
  const donePercent = Math.round((doneCount / totalItems) * 100);

  const allItems = ROADMAP_PHASES.flatMap(phase => phase.items);
  const doneItems = allItems.filter(i => i.status === 'done');
  const plannedItems = allItems.filter(i => i.status === 'planned');

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
                <CheckFat size={18} /> {doneCount}
              </div>
              <div className="roadmap-stat-label">Shipped</div>
            </div>
            <div className="roadmap-stat-card">
              <div className="roadmap-stat-value">
                <Clock size={18} /> {plannedCount}
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

          {/* Kanban Board */}
          <motion.div className="roadmap-kanban" variants={staggerContainer}>
            <motion.div className="roadmap-kanban-col done-col" variants={fadeInUp}>
              <div className="roadmap-kanban-col-header">
                <CheckFat size={16} /> Done <span className="kanban-count">{doneItems.length}</span>
              </div>
              {doneItems.map((item, i) => (
                <div key={i} className="roadmap-kanban-card glass-card">{item.title}</div>
              ))}
            </motion.div>

            <motion.div className="roadmap-kanban-col progress-col" variants={fadeInUp}>
              <div className="roadmap-kanban-col-header">
                <Clock size={16} /> In Progress <span className="kanban-count">0</span>
              </div>
              <div className="roadmap-kanban-card glass-card" style={{ opacity: 0.5, fontStyle: 'italic' }}>
                Check back soon
              </div>
            </motion.div>

            <motion.div className="roadmap-kanban-col planned-col" variants={fadeInUp}>
              <div className="roadmap-kanban-col-header">
                <RocketLaunch size={16} /> Planned <span className="kanban-count">{plannedItems.length}</span>
              </div>
              {plannedItems.map((item, i) => (
                <div key={i} className="roadmap-kanban-card glass-card">{item.title}</div>
              ))}
            </motion.div>
          </motion.div>

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
