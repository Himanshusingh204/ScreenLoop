// ChatSidebar.jsx — Right sidebar with participants + E2EE chat tabs
import React, { useState, useRef, useEffect } from 'react';
import { ParticipantList } from './ParticipantList';
import { formatChatTime } from '../utils/formatTime';
import { sanitizeText } from '../utils/sanitizer';
import { Users, ChatTeardropText, LockSimple, PaperPlaneRight } from './icons';

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '😂', '🍿', '🎉'];

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {Array} props.participants
 * @param {string} props.mySocketId
 * @param {Array} props.messages
 * @param {Function} props.onSendMessage
 * @param {boolean} props.isActualHost
 * @param {Function} props.onKick
 * @param {Function} props.onTransferHost
 */
export function ChatSidebar({
  open,
  participants,
  mySocketId,
  messages,
  onSendMessage,
  isActualHost,
  onKick,
  onTransferHost,
}) {
  const [tab, setTab] = useState('people'); // 'people' | 'chat'
  const [draft, setDraft] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (tab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, tab]);

  const sendMessage = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setDraft('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const addEmoji = (emoji) => {
    setDraft((prev) => prev + emoji);
  };

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Room details and encrypted chat">
      {/* Tabs */}
      <div className="sidebar-tabs" role="tablist" aria-label="Sidebar Sections">
        <button
          id="tab-people"
          type="button"
          role="tab"
          aria-selected={tab === 'people'}
          aria-controls="panel-people"
          className={`sidebar-tab ${tab === 'people' ? 'active' : ''}`}
          onClick={() => setTab('people')}
        >
          <Users size={16} /> Viewers ({participants.length})
        </button>
        <button
          id="tab-chat"
          type="button"
          role="tab"
          aria-selected={tab === 'chat'}
          aria-controls="panel-chat"
          className={`sidebar-tab ${tab === 'chat' ? 'active' : ''}`}
          onClick={() => setTab('chat')}
        >
          <ChatTeardropText size={16} /> Live Chat
        </button>
      </div>

      {/* People tab */}
      {tab === 'people' && (
        <div id="panel-people" role="tabpanel" aria-labelledby="tab-people" className="flex-1 overflow-y-auto">
          <ParticipantList
            participants={participants}
            mySocketId={mySocketId}
            isActualHost={isActualHost}
            onKick={onKick}
            onTransferHost={onTransferHost}
          />
        </div>
      )}

      {/* Chat tab */}
      {tab === 'chat' && (
        <div id="panel-chat" role="tabpanel" aria-labelledby="tab-chat" className="flex flex-col flex-1 min-h-0">
          <div className="chat-e2ee-banner">
            <LockSimple size={14} /> <span>End-to-End Encrypted (AES-256-GCM)</span>
          </div>

          <div className="chat-messages" role="log" aria-live="polite">
            {messages.length === 0 && (
              <div className="chat-empty-state">
                <ChatTeardropText size={40} style={{ opacity: 0.3 }} />
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)', marginTop: 8 }}>
                  No messages yet. Say hello to everyone!
                </p>
              </div>
            )}
            {messages.map((msg) => {
              const isImageUrl =
                !msg.system &&
                typeof msg.text === 'string' &&
                msg.text.match(/^https:\/\/[^'"><\s]+?\.(gif|jpe?g|png|webp)(\?.*)?$/i);

              return (
                <div key={msg.id} className={`chat-message ${msg.system ? 'system' : ''}`}>
                  {!msg.system && (
                    <div className="chat-message-header">
                      <span className="chat-message-name">{sanitizeText(msg.name)}</span>
                      <span className="chat-message-time">{formatChatTime(msg.timestamp)}</span>
                    </div>
                  )}
                  <div className="chat-message-text">
                    {isImageUrl ? (
                      <a
                        href={msg.text}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="chat-image-link"
                      >
                        Open image
                      </a>
                    ) : (
                      <span>{msg.text}</span>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Emoji Bar */}
          <div className="chat-emoji-bar" role="toolbar" aria-label="Quick Emojis">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="chat-emoji-btn"
                onClick={() => addEmoji(emoji)}
                title={`Add ${emoji}`}
                aria-label={`Insert ${emoji} emoji`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div className="chat-input-area">
            <textarea
              id="chat-input"
              className="chat-input"
              placeholder="Send an encrypted message…"
              aria-label="Encrypted chat message input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              maxLength={500}
            />
            <button
              id="chat-send-btn"
              type="button"
              className="ctrl-btn chat-send-btn"
              onClick={sendMessage}
              disabled={!draft.trim()}
              title="Send encrypted message"
              aria-label="Send message"
            >
              <PaperPlaneRight size={20} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
