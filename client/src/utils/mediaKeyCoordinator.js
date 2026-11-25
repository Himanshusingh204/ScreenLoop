// mediaKeyCoordinator.js — media-E2EE key lifecycle over signaling, framework-free so it is unit-testable.
// Everyone publishes an ECDH public key ("hello"). When the host removes someone, the host mints a new media key,
// applies it locally and wraps it to each remaining peer; late joiners get the current key on their hello.
// The server only relays opaque bytes. Fails closed: a peer with no known public key simply loses media.
import { generateKeyPair, exportPublic, newMediaKey, wrapMediaKey, unwrapMediaKey } from './mediaKeys';

export class MediaKeyCoordinator {
  /** @param {{socket:any, roomId:string, isHost:()=>boolean, applyKey:(key:string)=>Promise<void>}} deps */
  constructor({ socket, roomId, isHost, applyKey }) {
    Object.assign(this, { socket, roomId, isHost, applyKey });
    this.pubs = {}; // socketId -> public key
    this.currentKey = null; // set only after a rotation; null means "still the URL-hash key"
    this.pair = null;
    this.myPub = '';
    this.onHello = async ({ from, pub }) => {
      this.pubs[from] = pub;
      if (this.isHost() && this.currentKey) await this.sendTo(from);
    };
    this.onRekey = async (msg) => {
      if (!this.pair) return;
      const key = await unwrapMediaKey(msg, this.pair.privateKey, msg.hostPub);
      if (!key) return;
      this.currentKey = key;
      await this.applyKey(key);
    };
    this.onLeft = async ({ kicked, participants }) => {
      if (!kicked || !this.isHost() || !this.pair) return;
      const key = newMediaKey();
      this.currentKey = key;
      await this.applyKey(key);
      await Promise.all(
        (participants || []).map((p) => {
          if (p.e2ePub) this.pubs[p.socketId] = p.e2ePub;
          return p.socketId === this.socket.id ? null : this.sendTo(p.socketId);
        })
      );
    };
  }

  async sendTo(to) {
    const pub = this.pubs[to];
    if (!pub || !this.currentKey) return;
    const wrapped = await wrapMediaKey(this.currentKey, this.pair.privateKey, pub);
    this.socket.emit('e2ee:rekey', { roomId: this.roomId, to, hostPub: this.myPub, ...wrapped });
  }

  /** Learn peers' public keys from a participant list (e.g. room:joined). */
  seed(participants) {
    for (const p of participants || []) if (p.e2ePub && p.socketId !== this.socket.id) this.pubs[p.socketId] = p.e2ePub;
  }

  async start() {
    this.stop(); // idempotent: a reconnect calls start() again and must not double-register
    this.socket.on('e2ee:hello', this.onHello);
    this.socket.on('e2ee:rekey', this.onRekey);
    this.socket.on('room:user-left', this.onLeft);
    this.pair = await generateKeyPair();
    this.myPub = await exportPublic(this.pair.publicKey);
    this.socket.emit('e2ee:hello', { roomId: this.roomId, pub: this.myPub });
  }

  stop() {
    this.socket.off('e2ee:hello', this.onHello);
    this.socket.off('e2ee:rekey', this.onRekey);
    this.socket.off('room:user-left', this.onLeft);
  }
}
