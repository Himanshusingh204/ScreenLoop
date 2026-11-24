/** Filter chat messages by search term; system messages are hidden while searching. */
export function filterMessages(messages, search) {
  const q = (search || '').trim().toLowerCase();
  if (!q) return messages;
  return messages.filter((m) => !m.system && (m.text || '').toLowerCase().includes(q));
}
