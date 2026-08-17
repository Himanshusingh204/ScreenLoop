# Screenloop Pro — Premium Utilitarian Minimalism Design Plan

## Design Philosophy
Transform from dark glassmorphism SaaS to **warm monochrome editorial UI** for marketing pages, while keeping **dark cinema theme** for the actual room/watch experience.

### Key Decisions
- **Home/Landing**: Light theme (warm monochrome, editorial)
- **Room/Watch**: Dark theme (cinema-optimized, keep existing glassmorphism)
- **Themes**: Keep all 4 variants (Midnight, OLED, Ocean, Crimson) — improve gradients
- **Fonts**: Free Google Fonts — Geist Sans (UI), Newsreader (editorial headings), Geist Mono (code)
- **Icons**: Phosphor Icons (Bold weight) via `@phosphor-icons/react`
- **Animations**: Framer Motion for scroll-reveal, stagger, micro-interactions
- **Design System**: Inline CSS variables (no separate package)

---

## Phase 1: Design Tokens & CSS Foundation (`client/src/index.css`)

### Color System — Dual Theme Support

#### Light Theme (Home/Marketing)
```css
:root {
  /* Warm Monochrome */
  --canvas: #FFFFFF;
  --canvas-warm: #F7F6F3;
  --surface: #FFFFFF;
  --surface-elevated: #F9F9F8;
  --border: #EAEAEA;
  --border-strong: rgba(0,0,0,0.06);
  --text-primary: #111111;
  --text-secondary: #787774;
  --text-muted: #A8A8A4;
  
  /* Muted Pastel Accents */
  --accent-red-bg: #FDEBEC;   --accent-red-text: #9F2F2D;
  --accent-blue-bg: #E1F3FE;  --accent-blue-text: #1F6C9F;
  --accent-green-bg: #EDF3EC; --accent-green-text: #346538;
  --accent-yellow-bg: #FBF3DB; --accent-yellow-text: #956400;
  
  /* Gradients (improved — subtle, warm) */
  --gradient-hero: radial-gradient(ellipse 80% 50% at 50% 0%, rgba(124,92,252,0.08), transparent);
  --gradient-card: linear-gradient(135deg, rgba(124,92,252,0.03), rgba(14,165,233,0.03));
  --gradient-accent: linear-gradient(135deg, #7c5cfc, #0ea5e9);
  
  /* Typography */
  --font-sans: 'Geist', 'SF Pro Display', system-ui, sans-serif;
  --font-serif: 'Newsreader', 'Georgia', serif;
  --font-mono: 'Geist Mono', 'SF Mono', monospace;
  
  /* Spacing */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-5: 20px; --space-6: 24px; --space-8: 32px; --space-12: 48px; --space-16: 64px;
  
  /* Radius — max 12px, no rounded-full on containers */
  --radius-sm: 4px; --radius-md: 8px; --radius-lg: 12px; --radius-xl: 16px;
  
  /* Shadows — ultra-diffuse */
  --shadow-none: none;
  --shadow-subtle: 0 1px 2px rgba(0,0,0,0.03);
  --shadow-card: 0 2px 8px rgba(0,0,0,0.04);
  --shadow-hover: 0 8px 24px rgba(0,0,0,0.06);
  --shadow-modal: 0 20px 40px rgba(0,0,0,0.1);
  
  /* Transitions */
  --transition-fast: 150ms cubic-bezier(0.16, 1, 0.3, 1);
  --transition-base: 200ms cubic-bezier(0.16, 1, 0.3, 1);
  --transition-slow: 600ms cubic-bezier(0.16, 1, 0.3, 1);
}
```

#### Dark Theme (Room/Cinema) — Enhanced Existing
```css
[data-theme="midnight"] {
  --bg-primary: #0a0a0c;
  --bg-secondary: #111114;
  --bg-surface: #16161a;
  --bg-elevated: #1c1c22;
  --bg-hover: #24242c;
  --accent: #8b6dff;
  --accent-hover: #a38fff;
  --accent-dim: rgba(139, 109, 255, 0.15);
  --text-primary: #f0f0f5;
  --text-secondary: #9a9ab0;
  --text-muted: #6a6a7a;
  --border: rgba(255,255,255,0.06);
  --border-strong: rgba(255,255,255,0.1);
  --gradient-hero: radial-gradient(ellipse 80% 50% at 50% 0%, rgba(139,109,255,0.15), transparent);
  --gradient-card: linear-gradient(135deg, rgba(139,109,255,0.05), rgba(14,165,233,0.05));
  --shadow-card: 0 4px 16px rgba(0,0,0,0.4);
  --shadow-hover: 0 8px 32px rgba(0,0,0,0.5);
  --shadow-modal: 0 20px 60px rgba(0,0,0,0.6);
}
```

Keep existing OLED, Ocean, Crimson variants — enhance their gradients similarly.

### Base Styles
- Light theme: Clean, editorial, 1px borders, subtle shadows
- Dark theme: Keep glassmorphism, backdrop-filter, ambient glows
- Shared: Framer Motion integration, focus-visible rings

---

## Phase 2: Dependencies

```bash
npm install @phosphor-icons/react framer-motion
```

---

## Phase 3: Icon System (`client/src/components/icons/index.js`)

```jsx
// Barrel export — Phosphor Bold weight
export {
  FilmStrip, RocketLaunch, LinkSimple, LockSimple, PencilSimple,
  Lightning, ChartBar, Phone, Users, ChatTeardropText, Confetti,
  Fire, Heart, EmojiLaugh, Popcorn, X, ArrowLeft, ArrowRight,
  MagnifyingGlass, GearSix, Moon, Sun, GitHubLogo, QrCode,
  MonitorPlay, Square, VolumeHigh, VolumeLow, VolumeX,
  Zap, Maximize, Minimize, PictureInPicture, BarChart,
  CaretDown, CaretUp, Plus, Minus, Check, CopySimple,
  ShareNetwork, Cursor, PaintBrush, Eraser, Palette,
  Trash, Bell, Info, WarningCircle, CheckCircle
} from '@phosphor-icons/react/bold';
```

Icon size standards:
- UI controls: 20px
- Feature cards: 28px
- Hero: 32px

---

## Phase 4: Animation System (Framer Motion)

### Scroll Reveal Variants
```jsx
// client/src/hooks/useScrollReveal.js
export const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

export const slideInRight = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
};
```

### Micro-interactions
- Button tap: `whileTap={{ scale: 0.97 }}`
- Card hover: `whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(0,0,0,0.08)' }}`
- Input focus: `whileFocus={{ borderColor: 'var(--accent)', boxShadow: '0 0 0 3px var(--accent-dim)' }}`

---

## Phase 5: Home Page Transformation (`client/src/pages/Home.jsx`)

### Structure
```jsx
<main className="home-layout">
  {/* Header — minimal, light */}
  <header className="home-header">
    <Link to="/" className="home-logo" aria-label="Screenloop Home">
      <FilmStrip className="logo-mark" size={28} weight="bold" />
      <span className="logo-text">Screenloop</span>
    </Link>
    <a href="https://github.com/..." className="btn-ghost btn-sm" target="_blank" rel="noreferrer">
      <GitHubLogo size={18} /> GitHub
    </a>
  </header>

  {/* Hero — massive whitespace, editorial typography */}
  <section className="home-hero" aria-labelledby="hero-title">
    <motion.div className="hero-content" variants={fadeInUp}>
      <span className="hero-tag">Peer-to-Peer · 48kHz Audio · AES-256 E2EE</span>
      <h1 id="hero-title" className="hero-title">
        Watch Movies Together
        <br />
        <span className="hero-title-accent">In Pure HD Sync</span>
      </h1>
      <p className="hero-description">
        Share your screen in up to 1440p resolution with uncompressed stereo audio,
        live drawing annotations, and zero signups or downloads.
      </p>
    </motion.div>

    {/* Action Card — bento style */}
    <motion.div className="hero-action-card" variants={fadeInUp} role="region" aria-label="Room Launcher">
      <div className="card-tabs" role="tablist">
        <button role="tab" aria-selected={tab==='create'} className={`card-tab ${tab==='create'?'active':''}`} onClick={()=>setTab('create')}>
          <RocketLaunch size={18} /> Create Watch Room
        </button>
        <button role="tab" aria-selected={tab==='join'} className={`card-tab ${tab==='join'?'active':''}`} onClick={()=>setTab('join')}>
          <LinkSimple size={18} /> Join via Link
        </button>
      </div>
      {/* Tab panels with forms */}
    </motion.div>
  </section>

  {/* Features — Asymmetrical Bento Grid */}
  <section className="home-features" aria-labelledby="features-title">
    <motion.div className="features-header" variants={fadeInUp}>
      <h2 id="features-title" className="features-title">Engineered for Cinema Watch Parties</h2>
      <p className="features-sub">Built from scratch with zero compromises on quality, audio fidelity, or privacy.</p>
    </motion.div>
    <motion.div className="features-grid" variants={staggerContainer}>
      {/* 6 feature cards — alternating large/small */}
      <FeatureCard icon={FilmStrip} title="Uncompressed 48kHz Stereo Audio" desc="..." size="large" />
      <FeatureCard icon={LockSimple} title="Zero-Knowledge E2EE Chat" desc="..." />
      <FeatureCard icon={PencilSimple} title="Live Screen Drawing & Laser Pointer" desc="..." />
      <FeatureCard icon={Lightning} title="Dialogue & Volume Booster" desc="..." />
      <FeatureCard icon={ChartBar} title="Stream Telemetry HUD" desc="..." />
      <FeatureCard icon={Phone} title="1-Tap QR Code Mobile Join" desc="..." size="large" />
    </motion.div>
  </section>

  {/* FAQ — Border-only accordions */}
  <section className="home-faq" aria-labelledby="faq-title">
    <motion.div className="faq-header" variants={fadeInUp}>
      <h2 id="faq-title" className="faq-title">Frequently Asked Questions</h2>
      <p className="faq-sub">Everything you need to know about privacy and performance.</p>
    </motion.div>
    <div className="faq-list">
      {faqs.map((faq, i) => (
        <FaqItem key={i} question={faq.q} answer={faq.a} index={i} />
      ))}
    </div>
  </section>

  {/* Keyboard Shortcuts — kbd micro-UIs */}
  <section className="home-shortcuts" aria-labelledby="shortcuts-title">
    <h3 id="shortcuts-title" className="shortcuts-title">Keyboard Shortcuts</h3>
    <div className="shortcuts-grid">
      <Shortcut key="M" desc="Toggle Mute" />
      <Shortcut key="F" desc="Fullscreen" />
      <Shortcut key="Esc" desc="Exit Overlays" />
    </div>
  </section>

  {/* Footer */}
  <footer className="home-footer">
    <p>Screenloop · Zero-Friction Peer-to-Peer Watch Party</p>
    <p>Open Source · MIT Licensed · Built by <a href="...">Himanshu</a></p>
  </footer>
</main>
```

### Copy Refinements
- "Zero-friction" → "No accounts. No installs. Just a link."
- "Unleash" / "Elevate" / "Seamless" → removed
- Plain, specific language throughout

---

## Phase 6: Room Page — Keep Dark, Enhance

### Strategy
- **Keep**: Dark theme, glassmorphism, ambient glows, backdrop-filter
- **Enhance**: 
  - Improve gradients (more subtle, warmer)
  - Replace Lucide → Phosphor Bold
  - Refine shadows (more diffuse)
  - Better focus rings
  - Smoother Framer Motion transitions
  - Keep all 4 theme variants

### Components to Update (Dark Theme Preserved)
| Component | Changes |
|-----------|---------|
| `TopBar.jsx` | Phosphor icons, refined glassmorphism, better gradient |
| `ControlBar.jsx` | Phosphor icons, improved slider styling, smoother overlay transition |
| `VideoPlayer.jsx` | Keep ambient glow, refine placeholder |
| `ChatSidebar.jsx` | Phosphor icons, better message bubbles, emoji picker |
| `ParticipantList.jsx` | Phosphor icons, refined avatars with theme-aware colors |
| `JoinModal.jsx` | Enhanced glassmorphism, better focus states |
| `ShareModal.jsx` | Refined QR display, cleaner layout |
| `StatsOverlay.jsx` | Monospace metrics, better grid |
| `AnnotationCanvas.jsx` | Phosphor icons, refined toolbar |
| `CursorOverlay.jsx` | Keep as-is (functional) |
| `ReactionOverlay.jsx` | Keep floating emojis |
| `Toast.jsx` | Refined glassmorphism |
| `Loader.jsx` | Keep spinner, improve color |

---

## Phase 7: Shared Component Updates

### Button System (Both Themes)
```css
.btn {
  font-family: var(--font-sans);
  border-radius: var(--radius-md);
  font-weight: 500;
  letter-spacing: 0.01em;
  transition: all var(--transition-fast);
}

.btn-primary {
  /* Light: dark bg, white text */
  /* Dark: accent bg, white text */
}

.btn-ghost {
  /* Light: transparent, border */
  /* Dark: transparent, subtle border */
}
```

### Input System
```css
.input {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--text-primary);
  font-family: var(--font-sans);
}
.input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-dim);
}
```

### Card System
```css
.card {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  padding: var(--space-6);
  /* Light: subtle shadow */
  /* Dark: glassmorphism */
}
```

---

## Phase 8: Font Loading (`client/index.html`)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&family=Newsreader:opsz,wght@6..72,400;6..72,600&display=swap" rel="stylesheet">
```

---

## Phase 9: Implementation Order

1. **Install deps** → `@phosphor-icons/react`, `framer-motion`
2. **Create icon barrel** → `client/src/components/icons/index.js`
3. **Update CSS variables** → Full token rewrite in `index.css` (dual theme)
4. **Create animation hooks** → `useScrollReveal`, variants
5. **Transform Home.jsx** → Complete rewrite with Framer Motion
6. **Update Room components** → Phosphor icons, enhanced dark theme
7. **Update shared utilities** → Buttons, inputs, cards
8. **Update index.html** → Font imports
9. **Build & verify** → `npm run build`

---

## Quality Gates

- [ ] Build passes without errors
- [ ] No Lucide imports remain
- [ ] All icons from Phosphor Bold
- [ ] Framer Motion animations smooth (60fps)
- [ ] Light theme: editorial, warm, 1px borders
- [ ] Dark theme: cinematic, glassmorphism preserved
- [ ] Theme switching works for all 4 variants
- [ ] Focus-visible rings on all interactive elements
- [ ] Scroll reveal staggered on Home page
- [ ] Micro-interactions on buttons, cards, inputs
- [ ] Copy refined — no banned words
- [ ] Responsive on mobile/tablet/desktop

---

## File Inventory

| File | Action |
|------|--------|
| `client/package.json` | Add deps |
| `client/src/index.css` | Complete rewrite — dual theme tokens |
| `client/index.html` | Font imports |
| `client/src/components/icons/index.js` | New — Phosphor barrel |
| `client/src/hooks/useScrollReveal.js` | New — Framer variants |
| `client/src/pages/Home.jsx` | Complete rewrite — light editorial |
| `client/src/pages/Room.jsx` | Minor — ensure dark theme context |
| `client/src/components/TopBar.jsx` | Phosphor icons, enhanced glassmorphism |
| `client/src/components/ControlBar.jsx` | Phosphor icons, refined overlay |
| `client/src/components/VideoPlayer.jsx` | Minor refinements |
| `client/src/components/ChatSidebar.jsx` | Phosphor icons, refined bubbles |
| `client/src/components/ParticipantList.jsx` | Phosphor icons, refined avatars |
| `client/src/components/JoinModal.jsx` | Enhanced glassmorphism |
| `client/src/components/ShareModal.jsx` | Refined layout |
| `client/src/components/StatsOverlay.jsx` | Monospace metrics |
| `client/src/components/AnnotationCanvas.jsx` | Phosphor icons, refined toolbar |
| `client/src/components/Toast.jsx` | Refined glassmorphism |
| `client/src/components/Loader.jsx` | Minor |
| `client/src/components/ThemeSelector.jsx` | Keep — update for new tokens |
| `client/src/components/CursorOverlay.jsx` | Keep |
| `client/src/components/ReactionOverlay.jsx` | Keep |