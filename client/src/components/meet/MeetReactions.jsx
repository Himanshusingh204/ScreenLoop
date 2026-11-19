import React from 'react';

const REACTIONS = [
  { emoji: '👍', label: 'Thumbs up' },
  { emoji: '❤️', label: 'Heart' },
  { emoji: '😂', label: 'Laugh' },
  { emoji: '😮', label: 'Wow' },
  { emoji: '👏', label: 'Clap' },
  { emoji: '🎉', label: 'Celebrate' },
];

export default function MeetReactions({ onReact, onClose }) {
  return (
    <>
      <div className="meet-drawer-overlay" style={{ background: 'transparent' }} onClick={onClose} />
      <div className="meet-reaction-popover">
        {REACTIONS.map(({ emoji, label }) => (
          <button
            key={label}
            className="meet-reaction-btn"
            onClick={() => onReact(emoji)}
            aria-label={label}
            title={label}
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  );
}
