import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SiteHeader, SiteFooter } from '../components';
import {
  VideoCamera, ArrowRight, MonitorPlay,
  ShieldCheck, Smiley, RocketLaunch
} from '../components/icons';
import { generateRoomId, withViewTransition } from '../utils';
import { staggerContainer, fadeInUp } from '../hooks/useScrollReveal';

export default function MeetLanding() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleNewMeet = () => {
    const meetId = generateRoomId();
    withViewTransition(() => {
      navigate(`/meet/${meetId}`);
    });
  };

  const handleJoinCode = (e) => {
    e.preventDefault();
    setError('');
    let input = code.trim();
    if (!input) {
      setError('Please enter a meeting code or link.');
      return;
    }

    // Extract meetId if full URL was pasted
    if (input.includes('/meet/')) {
      input = input.split('/meet/')[1].split(/[?#]/)[0];
    }

    withViewTransition(() => {
      navigate(`/meet/${input}`);
    });
  };

  return (
    <div className="page-wrapper">
      <SiteHeader />

      <main id="main-content" tabIndex={-1} className="meet-landing-content" style={{ minHeight: 'calc(100vh - 160px)', padding: 'var(--space-8) var(--space-4)' }}>
        <motion.div
          className="container"
          style={{ maxWidth: '1000px', margin: '0 auto' }}
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Hero Section */}
          <motion.div
            className="text-center"
            style={{ marginBottom: 'var(--space-8)' }}
            variants={fadeInUp}
          >
            <div
              className="hero-pill"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 16px',
                borderRadius: '9999px',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                color: 'var(--meet-accent, #60a5fa)',
                fontSize: '0.875rem',
                fontWeight: 600,
                marginBottom: 'var(--space-4)',
              }}
            >
              <VideoCamera size={16} weight="fill" />
              <span>Real-Time Video Conferences & Meetings</span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(2rem, 5vw, 3.25rem)',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                marginBottom: 'var(--space-3)',
                lineHeight: 1.15,
              }}
            >
              Frictionless Video Meetings, <br />
              <span style={{ color: 'var(--meet-accent, #60a5fa)' }}>No Accounts Required</span>
            </h1>

            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '1.15rem',
                maxWidth: '620px',
                margin: '0 auto var(--space-8) auto',
                lineHeight: 1.6,
              }}
            >
              Connect face-to-face with friends and teammates. Crystal-clear voice, high-definition camera, instant screen sharing, and connections encrypted in transit.
            </p>

            {/* Main Action Launcher Card */}
            <div
              className="glass-card"
              style={{
                maxWidth: '680px',
                margin: '0 auto',
                padding: 'var(--space-6)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-xl)',
                background: 'var(--bg-glass, rgba(17, 24, 39, 0.65))',
                border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: 'var(--space-5)',
                  alignItems: 'center',
                }}
              >
                {/* Instant Meeting Action */}
                <div style={{ textAlign: 'left', padding: 'var(--space-2)' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '6px' }}>
                    Start New Meeting
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                    Create an instant meeting room and share the link.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary btn-md w-full"
                    onClick={handleNewMeet}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px 20px',
                      fontWeight: 600,
                    }}
                  >
                    <RocketLaunch size={18} />
                    <span>Start Instant Meeting</span>
                  </button>
                </div>

                {/* Join Meeting Action */}
                <div
                  style={{
                    textAlign: 'left',
                    padding: 'var(--space-2)',
                    borderLeft: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                  }}
                >
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '6px' }}>
                    Join with Code or Link
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                    Have an invitation? Enter the room code or link below.
                  </p>
                  <form onSubmit={handleJoinCode} style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. k9x2-pq4m"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      maxLength={60}
                      aria-label="Meeting code or link"
                      style={{ flex: 1, padding: '10px 14px' }}
                    />
                    <button
                      type="submit"
                      className="btn btn-secondary btn-md"
                      disabled={!code.trim()}
                      aria-label="Join meeting"
                      style={{ minWidth: '46px', padding: '0 14px' }}
                    >
                      <ArrowRight size={18} />
                    </button>
                  </form>
                  {error && (
                    <p style={{ color: 'var(--danger, #ef4444)', fontSize: '0.8rem', marginTop: '6px' }}>
                      {error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            className="meet-feature-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 'var(--space-4)',
              marginTop: 'var(--space-8)',
            }}
            variants={staggerContainer}
          >
            <motion.div className="glass-card" style={{ padding: 'var(--space-5)', borderRadius: 'var(--radius-lg)' }} variants={fadeInUp}>
              <div style={{ color: 'var(--meet-accent, #60a5fa)', marginBottom: 'var(--space-2)' }}>
                <VideoCamera size={28} />
              </div>
              <h4 style={{ fontWeight: 600, marginBottom: '6px' }}>Multi-Grid Video</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Dynamic grid with active speaker spotlighting, camera toggles, and participant drawers.
              </p>
            </motion.div>

            <motion.div className="glass-card" style={{ padding: 'var(--space-5)', borderRadius: 'var(--radius-lg)' }} variants={fadeInUp}>
              <div style={{ color: 'var(--meet-accent, #60a5fa)', marginBottom: 'var(--space-2)' }}>
                <MonitorPlay size={28} />
              </div>
              <h4 style={{ fontWeight: 600, marginBottom: '6px' }}>Screen Sharing</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Share tabs, documents, or your entire screen with system audio in crisp high definition.
              </p>
            </motion.div>

            <motion.div className="glass-card" style={{ padding: 'var(--space-5)', borderRadius: 'var(--radius-lg)' }} variants={fadeInUp}>
              <div style={{ color: 'var(--meet-accent, #60a5fa)', marginBottom: 'var(--space-2)' }}>
                <Smiley size={28} />
              </div>
              <h4 style={{ fontWeight: 600, marginBottom: '6px' }}>Live Reactions & Hand Raise</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Send floating emoji reactions and raise your hand to signal when you want to speak.
              </p>
            </motion.div>

            <motion.div className="glass-card" style={{ padding: 'var(--space-5)', borderRadius: 'var(--radius-lg)' }} variants={fadeInUp}>
              <div style={{ color: 'var(--meet-accent, #60a5fa)', marginBottom: 'var(--space-2)' }}>
                <ShieldCheck size={28} />
              </div>
              <h4 style={{ fontWeight: 600, marginBottom: '6px' }}>Direct & Private</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Audio and video are encrypted in transit (WebRTC). No accounts, no tracking. End-to-end media encryption is planned.
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      </main>

      <SiteFooter />
    </div>
  );
}
