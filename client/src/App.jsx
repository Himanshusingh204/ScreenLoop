// App.jsx — Root router with ErrorBoundary and lazy-loaded routes
import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';
import GradientBackground from './components/GradientBackground';
import Home from './pages/Home';
import NotFound from './pages/NotFound';

const Room = lazy(() => import('./pages/Room'));
const Features = lazy(() => import('./pages/Features'));
const Security = lazy(() => import('./pages/Security'));
const About = lazy(() => import('./pages/About'));
const Help = lazy(() => import('./pages/Help'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const Contact = lazy(() => import('./pages/Contact'));
const Roadmap = lazy(() => import('./pages/Roadmap'));
const Changelog = lazy(() => import('./pages/Changelog'));
const Accessibility = lazy(() => import('./pages/Accessibility'));

function RouteLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>
      <span className="loader" /> Loading…
    </div>
  );
}

// Scrolls to the top on route changes and to an anchored section when the URL
// carries a #hash (e.g. /help#troubleshooting from the footer links).
function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 76;
        window.scrollTo({ top, behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <ScrollManager />
        <GradientBackground />
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/room/:roomId" element={<RouteErrorBoundary><Room /></RouteErrorBoundary>} />
            <Route path="/features" element={<RouteErrorBoundary><Features /></RouteErrorBoundary>} />
            <Route path="/security" element={<RouteErrorBoundary><Security /></RouteErrorBoundary>} />
            <Route path="/about" element={<RouteErrorBoundary><About /></RouteErrorBoundary>} />
            <Route path="/help" element={<RouteErrorBoundary><Help /></RouteErrorBoundary>} />
            <Route path="/privacy" element={<RouteErrorBoundary><Privacy /></RouteErrorBoundary>} />
            <Route path="/terms" element={<RouteErrorBoundary><Terms /></RouteErrorBoundary>} />
            <Route path="/contact" element={<RouteErrorBoundary><Contact /></RouteErrorBoundary>} />
            <Route path="/roadmap" element={<RouteErrorBoundary><Roadmap /></RouteErrorBoundary>} />
            <Route path="/changelog" element={<RouteErrorBoundary><Changelog /></RouteErrorBoundary>} />
            <Route path="/accessibility" element={<RouteErrorBoundary><Accessibility /></RouteErrorBoundary>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
