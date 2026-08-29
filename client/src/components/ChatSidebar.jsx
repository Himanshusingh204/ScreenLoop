// ChatSidebar.jsx — Right sidebar with participants + E2EE chat tabs
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ParticipantList } from './ParticipantList';
import { formatChatTime } from '../utils/formatTime';
import { sanitizeText } from '../utils/sanitizer';
import { linkifyText } from '../utils/linkify';
import { Users, ChatTeardropText, LockSimple, PaperPlaneRight, CopySimple, Check, MagnifyingGlass, Smiley, Trash, PencilSimple } from './icons';

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '😂', '🍿', '🎉'];
const EMOJI_PANEL = [
  '😀', '😂', '🤣', '😊', '😍', '🥰', '😎', '🤔',
  '👍', '👎', '❤️', '🔥', '⭐', '💯', '🎉', '🥳',
  '🍿', '🎬', '🎵', '👀', '💀', '😭', '🙌', '✨',
  '👀', '🫡', '💪', '🤝', '🫠', '💜', '🧠', '🕊️',
];

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
  onDeleteMessage,
  onEditMessage,
  onTyping,
  typingUsers: typingUsersProp,
  isActualHost,
  onKick,
  onTransferHost,
}) {
  const [tab, setTab] = useState('people'); // 'people' | 'chat'
  const [draft, setDraft] = useState('');
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [search, setSearch] = useState('');
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [typingUsers, setTypingUsers] = useState({});
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const prevMsgCountRef = useRef(messages.length);

  // Track unread messages when on People tab
  useEffect(() => {
    if (tab !== 'chat' && messages.length > prevMsgCountRef.current) {
      const newMsgs = messages.length - prevMsgCountRef.current;
      const newSystemMsgs = messages.slice(-newMsgs).filter((m) => m.system).length;
      const newUserMsgs = newMsgs - newSystemMsgs;
      if (newUserMsgs > 0) {
        setUnreadCount((c) => c + newUserMsgs);
      }
    }
    prevMsgCountRef.current = messages.length;
  }, [messages, tab]);

  // Clear unread when switching to chat tab
  useEffect(() => {
    if (tab === 'chat') setUnreadCount(0);
  }, [tab]);

  // Clear stale typing indicators after 3s
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers((prev) => {
        const now = Date.now();
        const next = {};
        for (const [id, data] of Object.entries(prev)) {
          if (now - data.ts < 3000) next[id] = data;
        }
        return Object.keys(next).length === Object.keys(prev).length ? prev : next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (tab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, tab]);

  // Auto-grow textarea + emit typing
  const handleDraftChange = useCallback((e) => {
    setDraft(e.target.value);
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    }
    onTyping?.();
  }, [onTyping]);

  const sendMessage = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setDraft('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const addEmoji = (emoji) => {
    setDraft((prev) => prev + emoji);
    setShowEmojiPanel(false);
    textareaRef.current?.focus();
  };

  const copyMessage = async (msgId, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMsgId(msgId);
      setTimeout(() => setCopiedMsgId((id) => (id === msgId ? null : id)), 1500);
    } catch {
      // Clipboard unavailable
    }
  };

  const handleDelete = (msgId, msgTimestamp) => {
    onDeleteMessage?.(msgId, msgTimestamp);
  };

  const startEdit = (msgId, currentText) => {
    setEditingMsgId(msgId);
    setEditDraft(currentText);
  };

  const submitEdit = (msgId, msgTimestamp) => {
    if (editDraft.trim()) {
      onEditMessage?.(msgId, msgTimestamp, editDraft.trim());
    }
    setEditingMsgId(null);
    setEditDraft('');
  };

  const cancelEdit = () => {
    setEditingMsgId(null);
    setEditDraft('');
  };

  const filteredMessages = search.trim()
    ? messages.filter(
        (msg) =>
          !msg.system &&
          msg.text.toLowerCase().includes(search.toLowerCase())
      )
    : messages;

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
          <ChatTeardropText size={16} /> Chat
          {unreadCount > 0 && tab !== 'chat' && (
            <span className="chat-unread-badge">{unreadCount}</span>
          )}
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
            <LockSimple size={14} /> <span>Encrypted (AES-256-GCM)</span>
          </div>

          {/* Search bar */}
          <div className="chat-search-bar">
            <MagnifyingGlass size={14} className="chat-search-icon" />
            <input
              type="text"
              className="chat-search-input"
              placeholder="Search messages…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search chat messages"
            />
            {search && (
              <button
                type="button"
                className="chat-search-clear"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <div className="chat-messages" role="log" aria-live="polite">
            {filteredMessages.length === 0 && (
              <div className="chat-empty-state">
                <ChatTeardropText size={40} style={{ opacity: 0.3 }} />
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)', marginTop: 8 }}>
                  {search ? 'No messages match your search.' : 'No messages yet. Say hello!'}
                </p>
              </div>
            )}
            {filteredMessages.map((msg) => {
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
                      {msg.edited && <span className="chat-message-edited">(edited)</span>}
                      <button
                        type="button"
                        className="chat-message-copy"
                        onClick={() => copyMessage(msg.id, msg.text)}
                        title="Copy message"
                        aria-label="Copy message text"
                      >
                        {copiedMsgId === msg.id ? <Check size={12} /> : <CopySimple size={12} />}
                      </button>
                      {(isActualHost || msg.socketId === mySocketId) && (
                        <button
                          type="button"
                          className="chat-message-copy"
                          onClick={() => handleDelete(msg.id, msg.timestamp)}
                          title="Delete message"
                          aria-label="Delete message"
                        >
                          <Trash size={12} />
                        </button>
                      )}
                      {msg.socketId === mySocketId && Date.now() - msg.timestamp < 60000 && editingMsgId !== msg.id && (
                        <button
                          type="button"
                          className="chat-message-copy"
                          onClick={() => startEdit(msg.id, msg.text)}
                          title="Edit message (within 60s)"
                          aria-label="Edit message"
                        >
                          <PencilSimple size={12} />
                        </button>
                      )}
                    </div>
                  )}
                  {!msg.system && editingMsgId === msg.id ? (
                    <div className="chat-edit-area">
                      <input
                        type="text"
                        className="chat-edit-input"
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitEdit(msg.id, msg.timestamp);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        autoFocus
                        maxLength={500}
                      />
                      <div className="chat-edit-actions">
                        <button type="button" className="btn btn-ghost btn-xs" onClick={cancelEdit}>Cancel</button>
                        <button type="button" className="btn btn-primary btn-xs" onClick={() => submitEdit(msg.id, msg.timestamp)}>Save</button>
                      </div>
                    </div>
                  ) : (
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
                        linkifyText(msg.text).map((seg, i) =>
                          seg.type === 'link' ? (
                            <a
                              key={i}
                              href={seg.value}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="chat-link"
                            >
                              {seg.value}
                            </a>
                          ) : (
                            <span key={i}>{seg.value}</span>
                          )
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
            {Object.keys(typingUsersProp || {}).length > 0 && (
              <div className="chat-typing-indicator" aria-live="polite">
                {Object.values(typingUsersProp).map((u) => u.name).join(', ')} {Object.keys(typingUsersProp).length === 1 ? 'is' : 'are'} typing…
              </div>
            )}
          </div>

          {/* Emoji Panel */}
          {showEmojiPanel && (
            <div className="chat-emoji-panel" role="toolbar" aria-label="Emoji picker">
              {EMOJI_PANEL.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="chat-emoji-panel-btn"
                  onClick={() => addEmoji(emoji)}
                  aria-label={`Insert ${emoji} emoji`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

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
            <button
              type="button"
              className="chat-emoji-btn chat-emoji-toggle"
              onClick={() => setShowEmojiPanel((v) => !v)}
              title="More emojis"
              aria-label="Toggle emoji picker"
              aria-expanded={showEmojiPanel}
            >
              <Smiley size={16} />
            </button>
          </div>

          {/* Input Area */}
          <div className="chat-input-area">
            <textarea
              id="chat-input"
              ref={textareaRef}
              className="chat-input"
              placeholder="Send an encrypted message…"
              aria-label="Encrypted chat message input"
              value={draft}
              onChange={handleDraftChange}
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
