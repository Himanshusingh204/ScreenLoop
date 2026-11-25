// meshFallback.js — after the SFU fails, decide which peers THIS client should offer to.
// Both sides compute the same rule (lower socket id offers), so exactly one side initiates each pair (no glare),
// regardless of who joined first or when each side noticed the SFU was down.
export function pendingOffers(selfId, peerIds, offered) {
  return peerIds.filter((id) => selfId < id && !offered.has(id));
}
