// Contact.jsx — Contact & Feedback page with direct channels to reach the maintainer
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SiteHeader, SiteFooter } from '../components';
import { staggerContainer, fadeInUp } from '../hooks/useScrollReveal';
import {
  ChatTeardropText, MagnifyingGlass, Clock, GithubLogo, Info, RocketLaunch
} from '../components/icons';

const CHANNELS = [
  {
    icon: <ChatTeardropText size={26} />,
    title: 'Report a Bug',
    desc: 'The fastest way to report a problem. Include your browser, device, and the steps that led to the issue.',
    href: 'https://github.com/Himanshusingh204/ScreenLoop/issues',
    label: 'Open an Issue',
  },
  {
    icon: <GithubLogo size={26} />,
    title: 'Request a Feature',
    desc: 'Have an idea that would make watch parties better? Feature requests shape the roadmap.',
    href: 'https://github.com/Himanshusingh204/ScreenLoop/issues',
    label: 'Request a Feature',
  },
  {
    icon: <MagnifyingGlass size={26} />,
    title: 'Help Center',
    desc: 'Most questions are already answered in the FAQ and troubleshooting guides.',
    href: '/help',
    label: 'Browse Help Center',
    internal: true,
  },
  {
    icon: <Clock size={26} />,
    title: "See What's Next",
    desc: "Curious what's being worked on? Check the public roadmap and release notes.",
    href: '/roadmap',
    label: 'View Roadmap',
    internal: true,
  },
];

export default function Contact() {
  return (
    <div className="page-wrapper">
      <SiteHeader />

      <main className="contact-page-content">
        <motion.div
          className="contact-container"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Hero */}
          <motion.section className="page-hero" variants={fadeInUp}>
            <span className="about-eyebrow">Support & Feedback</span>
            <h1 className="page-hero-title">
              Get in Touch
            </h1>
            <p className="page-hero-subtitle">
              Screenloop is built in the open. Questions, bug reports, and feature
              ideas are welcome — the fastest way to reach us is on GitHub.
            </p>
          </motion.section>

          {/* Contact Channels */}
          <motion.div className="help-quick-cards" variants={fadeInUp}>
            <h2 className="section-title">How to Reach Us</h2>
            {CHANNELS.map((channel) => (
              <div key={channel.title} className="quick-guide-card">
                <div className="guide-icon">{channel.icon}</div>
                <h3>{channel.title}</h3>
                <p>{channel.desc}</p>
                {channel.internal ? (
                  <Link to={channel.href} className="card-inline-link">
                    {channel.label} →
                  </Link>
                ) : (
                  <a
                    href={channel.href}
                    target="_blank"
                    rel="noreferrer"
                    className="card-inline-link"
                  >
                    {channel.label} →
                  </a>
                )}
              </div>
            ))}
          </motion.div>

          {/* Note */}
          <motion.div className="contact-note" variants={fadeInUp}>
            <Info size={18} />
            <p>
              Please never share your full room link or encryption key in a public
              issue — anyone with that link can join your room. Screenshots and
              reproduction steps without sensitive data are perfect.
            </p>
          </motion.div>

          {/* CTA */}
          <motion.section className="help-section" variants={fadeInUp}>
            <div className="section-header-centered">
              <h2 className="section-title">Something to watch together?</h2>
              <p className="section-desc">
                Create an encrypted room in seconds — no accounts needed.
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