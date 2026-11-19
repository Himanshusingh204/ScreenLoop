# 📡 Screenloop — SFU Media Topology & LiveKit Scaling

> **Document Version**: 1.0  
> **Status**: Production Reference  
> **Target**: LiveKit SFU Architecture, Media Relaying, E2EE & Bandwidth Economics

---

## 1. Why Selective Forwarding Units (SFUs)?

### P2P Mesh (Legacy) vs. SFU (Modern)

| Characteristic | P2P Mesh (Old Screenloop) | LiveKit SFU (New Screenloop) |
|---|---|---|
| **Host Upload Streams** | $N - 1$ uploads (4 viewers = 4 streams) | **1 upload stream only** |
| **Viewer Download** | 1 stream per peer | 1 stream from SFU |
| **Max Room Capacity** | 3 - 5 users before freezing | **100+ simultaneous viewers** |
| **Symmetric NAT Handling** | Fails unless expensive TURN relays used | Built-in high-performance relay |
| **Simulcast & Dynamic Bitrate**| Impossible (host CPU crashes) | Native (1080p, 720p, 360p layers) |
| **CPU Usage on Host** | High (transcodes for each peer) | Minimal (encodes once) |

---

## 2. Bandwidth & Codec Optimization

### Cinema Movie Preset
For screensharing movies, Screenloop uses custom Opus audio encoding:
- **Audio Bitrate**: 128 kbps (Stereo 48kHz).
- **Video Bitrate**: 2.5 Mbps - 4.5 Mbps for 1080p60.
- **Video Codec Priority**: AV1 ➔ VP9 ➔ H.264 (hardware accelerated).

### Dynamic Layer Switching (Simulcast)
If a viewer has a slow mobile connection, LiveKit automatically drops them to 720p or 360p without affecting other viewers who are enjoying full 1080p60:
```
[ Host: 1080p @ 3.5Mbps ] ──▶ [ LiveKit SFU ] ──┬──▶ [ Viewer A (Fiber): 1080p ]
                                                ├──▶ [ Viewer B (WiFi): 720p ]
                                                └──▶ [ Viewer C (Mobile): 360p ]
```

---

## 3. End-to-End Encryption (E2EE) via Insertable Streams

LiveKit uses the WebRTC Insertable Streams API (`TransformStream`):
1. **Host Browser**: Encrypts raw video/audio frames using AES-256-GCM with the secret key from the URL `#hash`.
2. **SFU Server**: Inspects RTP headers to route packets, but the payload bytes remain 100% encrypted ciphertext. The server cannot view or store the video.
3. **Viewer Browser**: Receives ciphertext bytes and decrypts them using the key from the shared link.

---

## 4. Cost Analysis (LiveKit Cloud vs. Self-Hosted)

- **LiveKit Cloud Free Tier**:
  - **Bandwidth**: 50 GB / month (free forever).
  - Equivalent to **~35-40 full-length movie watch parties** with 2-3 friends for $0.
- **Self-Hosted (DigitalOcean / Hetzner / Railway)**:
  - $5 / month VPS gives ~1-2 TB of monthly bandwidth (enough for hundreds of movie nights).
