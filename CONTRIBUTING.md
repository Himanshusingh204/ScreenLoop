# Contributing to ScreenLoop

Thank you for your interest in contributing to **ScreenLoop**! ScreenLoop is an open-source, zero-friction peer-to-peer watch party and screen sharing platform built with React, WebRTC, Node.js, and Socket.IO.

We welcome contributions of all kinds: bug reports, documentation improvements, UI/UX polish, new features, and performance enhancements.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the App Locally](#running-the-app-locally)
- [Development Workflow](#development-workflow)
  - [Branch Naming](#branch-naming)
  - [Commit Messages](#commit-messages)
  - [Linting and Formatting](#linting-and-formatting)
  - [Testing](#testing)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Reporting Issues](#reporting-issues)
- [Security Disclosures](#security-disclosures)

---

## Code of Conduct

All contributors and maintainers are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please report unacceptable behavior following the guidelines in that document.

---

## Architecture Overview

ScreenLoop follows a modern, decoupled client/server architecture:

```
ScreenLoop/
├── client/              # React 18 frontend (Vite, Phosphor Icons, Canvas Confetti)
│   ├── src/
│   │   ├── components/  # Reusable UI widgets (Navbar, Footer, AudioMeter, etc.)
│   │   ├── pages/       # Route views (Home, Room, Features, Security, etc.)
│   │   ├── hooks/       # Custom React hooks (useWebRTC, useChat, etc.)
│   │   ├── utils/       # Helper functions & pure business logic
│   │   └── styles/      # Vanilla CSS design system
│   └── public/          # Static assets, icons, manifest
├── server/              # Node.js signaling server (Express + Socket.IO)
│   └── src/
│       ├── roomManager.js     # In-memory room state management
│       ├── socketHandlers.js  # Socket.IO event controllers & signaling
│       ├── rateLimiter.js     # Leaky-bucket / sliding window rate limiting
│       └── index.js           # Server entry point & health check
└── .github/             # GitHub actions CI/CD, issue/PR templates
```

- **Signaling Server (`server/`)**: Acts only as a lightweight coordinator for WebRTC session negotiation (SDP offers/answers and ICE candidates), chat messages, room state, and participant heartbeats. Media streams flow directly peer-to-peer.
- **Client (`client/`)**: Handles UI state, WebRTC peer connections (mesh topology), audio/video device management, and responsive layouts.

---

## Getting Started

### Prerequisites

- **Node.js**: `v18.0.0` or higher (`v20.x` recommended)
- **npm**: `v9.0.0` or higher
- Modern browser supporting WebRTC (`Chrome`, `Firefox`, `Edge`, `Safari 15+`)

### Installation

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/ScreenLoop.git
   cd ScreenLoop
   ```

2. **Install dependencies for root, client, and server:**
   ```bash
   # Install root dependencies
   npm install

   # Install client dependencies
   cd client && npm install

   # Install server dependencies
   cd ../server && npm install
   ```

### Running the App Locally

To test real-time communication, you need both the signaling server and the client running:

1. **Start the signaling server (default: port 4000):**
   ```bash
   cd server
   npm run dev
   ```

2. **In a separate terminal, start the client (default: port 5173):**
   ```bash
   cd client
   npm run dev
   ```

3. Open `http://localhost:5173` in your browser. You can open a second browser window (or incognito window) to test multi-user rooms and screen sharing locally.

---

## Development Workflow

### Branch Naming

Use descriptive branch names with conventional prefixes:

- `feat/<feature-name>` for new features (e.g., `feat/pip-mode`)
- `fix/<bug-name>` for bug fixes (e.g., `fix/ice-restart-reconnection`)
- `docs/<description>` for documentation changes (e.g., `docs/architecture-guide`)
- `refactor/<area>` for code refactoring (e.g., `refactor/room-manager`)
- `chore/<task>` for maintenance/deps (e.g., `chore/bump-vitest`)

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

Common types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation updates
- `style`: Formatting, missing semicolons, etc. (no code logic change)
- `refactor`: Code restructuring without bug fix or feature addition
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Build tasks, package updates, config changes

### Linting and Formatting

Before committing, run code checks:

```bash
# In client/
npm run lint
npm run format:check

# Auto-fix linting/formatting:
npm run lint:fix
npm run format
```

### Testing

Both the client and server include unit and integration tests using **Vitest**:

```bash
# Run server tests
cd server
npm test

# Run client tests
cd client
npm test
```

Please ensure all tests pass and consider adding test coverage for new features or bug fixes.

---

## Submitting a Pull Request

1. Push your changes to your feature branch on GitHub.
2. Open a Pull Request against the `main` branch.
3. Complete the [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md):
   - Provide a clear title and description of changes.
   - Reference any related issue (e.g., `Fixes #42`).
   - Include screenshots or screen recordings for UI changes.
4. Ensure GitHub Actions CI checks pass.
5. Address any review comments promptly.

---

## Reporting Issues

If you encounter bugs or have feature proposals:
- Check existing [Issues](https://github.com/Himanshusingh204/ScreenLoop/issues) to avoid duplicates.
- Use our [Bug Report Form](.github/ISSUE_TEMPLATE/bug_report.yml) or [Feature Request Form](.github/ISSUE_TEMPLATE/feature_request.yml).
- Include reproducible steps, browser/OS version, and relevant console logs.

---

## Security Disclosures

If you discover a potential security vulnerability, please do not file a public issue. Instead, refer to [SECURITY.md](SECURITY.md) for private disclosure instructions.
