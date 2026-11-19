import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { VideoCamera, ArrowRight } from '../components/icons';
import { generateRoomId } from '../utils';
import { fadeInUp } from '../hooks/useScrollReveal';

export default function MeetLanding() {
  const [code, setCode] = useState('');
  const navigate = useNavigate();

  const handleNewMeet = () => {
    const meetId = generateRoomId();
    navigate(`/meet/${meetId}`);
  };

  const handleJoinCode = (e) => {
    e.preventDefault();
    if (code.trim()) {
      navigate(`/meet/${code.trim()}`);
    }
  };

  return (
    <div className="meet-landing">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeInUp}
      >
        <VideoCamera size={64} style={{ color: 'var(--meet-accent)', marginBottom: 'var(--space-4)' }} />
        <h1>Video Meet</h1>
        <p>Start or join a video call. No account needed. P2P encrypted.</p>

        <div className="meet-landing-actions">
          <button className="btn btn-primary btn-lg" onClick={handleNewMeet}>
            New Meeting
          </button>

          <form onSubmit={handleJoinCode} className="meet-code-input">
            <input
              type="text"
              placeholder="Enter code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={20}
              aria-label="Meeting code"
            />
            <button type="submit" className="btn btn-secondary" disabled={!code.trim()} aria-label="Join meeting">
              <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
