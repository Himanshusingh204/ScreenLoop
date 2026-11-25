// mediaKeyCoordinator.js — media-E2EE key lifecycle over signaling, framework-free so it is unit-testable.
// Everyone publishes an ECDH public key ("hello"). When the host removes someone, the host mints a new media key,
// applies it locally and wraps it to each remaining peer; late joiners get the current key on their hello.
// Each rotation has an increasing epoch so a slow older key can never overwrite a newer one.
// The server only relays bytes and cannot read or forge keys (they are bound to the room key). Fails closed:
// a peer with no known public key simply loses media.
import { generateKeyPair, exportPublic, newMediaKey, wrapMediaKey, unwrapMediaKey } from './mediaKeys';

export class MediaKeyCoordinator {
  /** @param {{socket:any, roomId:string, roomKey:string, isHost:()=>boolean, applyKey:(key:string, epoch:number)=>Promise<void>, initialKey?:string|null, initialEpoch?:number}} deps */
  constructor({ socket, roomId, roomKey, isHost, applyKey, initialKey = null, initialEpoch = 0 }) {
    Object.assign(this, { socket, roomId, roomKey, isHost, applyKey });
    this.pubs = {}; // socketId -> public key
    this.currentKey = initialKey; // null means "still the URL-fragment key"
    this.epoch = initialEpoch;
    this.pair = null;
    this.myPub = '';
    this.onHello = async ({ from, pub }) => {
      this.pubs[from] = pub;
      if (this.isHost() && this.currentKey) await this.sendTo(from);
    };
    this.onRekey = async (msg) => {
      if (!this.pair || !Number.isInteger(msg?.epoch) || msg.epoch <= this.epoch) return;
      const key = await unwrapMediaKey(msg, this.pair.privateKey, msg.hostPub, this.roomKey);
      if (!key || msg.epoch <= this.epoch) return; // re-check: another rekey may have landed while we decrypted
      this.currentKey = key;
      this.epoch = msg.epoch;
      await this.applyKey(key, this.epoch);
    };
    this.onLeft = async ({ kicked, participants }) => {
      if (!kicked || !this.isHost() || !this.pair) return;
      const key = newMediaKey();
      this.currentKey = key;
      this.epoch += 1;
      await this.applyKey(key, this.epoch);
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
    const wrapped = await wrapMediaKey(this.currentKey, this.pair.privateKey, pub, this.roomKey);
    this.socket.emit('e2ee:rekey', { roomId: this.roomId, to, hostPub: this.myPub, epoch: this.epoch, ...wrapped });
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
