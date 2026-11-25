# Security Policy

The ScreenLoop team and community take the security and privacy of our users very seriously. As a peer-to-peer screen sharing and watch party platform, maintaining user data privacy, secure signaling, and resilient communication channels is a top priority.

---

## Supported Versions

We actively provide security updates and bug fixes for the following versions of ScreenLoop:

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

---

## Security Model & Guarantees

- **Media**: WebRTC media is encrypted in transit (DTLS-SRTP) and never touches our signaling servers. In watch rooms, when the link includes its `#key`, media frames are also end-to-end encrypted (LiveKit E2EE), so the SFU forwards ciphertext; the host rotates the key when removing someone. Video Meet and the P2P fallback are not frame-encrypted. Chat is end-to-end encrypted (AES-256-GCM).

- **Signaling Security**:
  Signaling messages are exchanged via Socket.IO over TLS/WSS. LiveKit tokens are issued only over an authenticated socket that is already a room member (PIN enforced); identity is the socket id, and only the server-recorded host may publish.

- **Room Protection & Access Control**:
  - Rooms can be PIN-protected with salted/hashed checks and brute-force lockout.
  - The host can kick participants. A kick removes them from the room and the SFU and rotates the media key; it is **not** a ban, because the link is the credential.
  - Server-side rate limiting (per client IP, honoring `TRUST_PROXY` safely), connection, room and payload caps limit abuse.
  - Multi-node deployments bind each socket to its room (`?room=`) so a same-named "shadow" room cannot be created on another node.

- **Client Input Sanitization**:
  User-supplied content (chat messages, participant names, room titles) is strictly sanitized and escaped to eliminate Cross-Site Scripting (XSS) risks.

---

## Reporting a Vulnerability

If you discover a security vulnerability in ScreenLoop, **please do not disclose it via a public GitHub issue or pull request.**

Instead, please report vulnerabilities via one of the following methods:

1. **GitHub Private Vulnerability Reporting (Recommended)**:
   Use the **"Report a vulnerability"** button under the [Security tab](https://github.com/Himanshusingh204/ScreenLoop/security/advisories/new) of our repository. This enables private, confidential reporting without exposing your personal email address.
2. **Direct Contact**:
   Reach out directly via maintainer channels on [GitHub Profile (@Himanshusingh204)](https://github.com/Himanshusingh204).

### What to Include

To help us triage and resolve the issue quickly, please include:
- A description of the vulnerability and its potential impact.
- Step-by-step reproduction instructions or a minimal Proof of Concept (PoC).
- Affected components (e.g., `client`, `server`, signaling protocol, WebRTC handling).
- The operating system, browser, and version(s) tested.

### Our Response Process

1. **Acknowledgment**: We will acknowledge receipt of your report within **48 hours**.
2. **Investigation**: We will assess the severity and impact, keeping you informed of our progress.
3. **Patch & Disclosure**: Once a patch is developed and verified, we will publish an update and coordinate public disclosure with appropriate attribution to the reporter.
