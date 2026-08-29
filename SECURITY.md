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

- **End-to-End Media Encryption (DTLS-SRTP)**:
  ScreenLoop leverages the browser WebRTC standard. All audio and video streams travel peer-to-peer and are encrypted using DTLS (Datagram Transport Layer Security) and SRTP (Secure Real-time Transport Protocol). Media never transits or gets stored on our signaling servers.

- **Signaling Security**:
  Signaling messages (SDP handshakes, ICE candidates, and text chat) are exchanged via Socket.IO over secure TLS/WSS connections.

- **Room Protection & Access Control**:
  - Rooms can be PIN-protected with salted/hashed checks to prevent unauthorized entry.
  - Hosts have the ability to kick or ban abusive participants.
  - Server-side rate limiting on room creation, connection requests, and chat messaging prevents abuse and DoS attacks.

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
