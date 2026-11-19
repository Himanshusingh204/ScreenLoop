import React, { useState, useRef, useEffect } from 'react';
import { X, PaperPlaneRight } from '../icons';

export default function MeetChatDrawer({ messages, onSend, onClose }) {
  const [text, setText] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <>
      <div className="meet-drawer-overlay" onClick={onClose} />
      <div className="meet-drawer open">
        <div className="meet-drawer-header">
          <h3>In-call messages</h3>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close chat">
            <X size={20} />
          </button>
        </div>

        <div className="meet-drawer-body">
          <div className="meet-chat-messages">
            {messages.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: 'var(--space-8) 0' }}>
                No messages yet. Say hello!
              </p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className="meet-chat-msg">
                <div className="meet-chat-msg-name">{msg.name}</div>
                <div className="meet-chat-msg-text">{msg.text}</div>
                {msg.time && <div className="meet-chat-msg-time">{msg.time}</div>}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="meet-chat-input" style={{ padding: '12px 20px' }}>
          <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <input
              type="text"
              placeholder="Send a message"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              aria-label="Chat message"
            />
            <button
              type="submit"
              className="meet-ctrl-btn"
              disabled={!text.trim()}
              aria-label="Send message"
              style={{ width: 40, height: 40, flexShrink: 0 }}
            >
              <PaperPlaneRight size={18} />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
