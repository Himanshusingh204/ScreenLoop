import React, { useRef, useEffect } from 'react';

/**
 * GradientBackground — Dark blob gradient with mouse-driven parallax.
 *
 * Two soft radial-gradient blobs (purple + blue) drift slowly on their own
 * and shift subtly when the user moves the mouse. All transforms are
 * GPU-composited (translate3d) — zero layout thrash, zero React re-renders.
 *
 * Props:
 *   baseColor   — Background base (default matches :root dark theme)
 *   blobColor1  — Upper-left blob color
 *   blobColor2  — Lower-right blob color
 */
export default function GradientBackground({
  baseColor = '#0d0d0f',
  blobColor1 = '#7c5cfc',
  blobColor2 = '#0ea5e9',
}) {
  const blob1Ref = useRef(null);
  const blob2Ref = useRef(null);
  const rafRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const offsetRef = useRef({ x1: 0, y1: 0, x2: 0, y2: 0 });

  useEffect(() => {
    const blob1 = blob1Ref.current;
    const blob2 = blob2Ref.current;
    if (!blob1 || !blob2) return;

    let running = true;

    const onMove = (e) => {
      mouseRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseRef.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    const tick = () => {
      if (!running) return;

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Lerp toward mouse offset (smooth follow)
      offsetRef.current.x1 += (mx * 30 - offsetRef.current.x1) * 0.04;
      offsetRef.current.y1 += (my * 30 - offsetRef.current.y1) * 0.04;
      offsetRef.current.x2 += (-mx * 25 - offsetRef.current.x2) * 0.04;
      offsetRef.current.y2 += (-my * 25 - offsetRef.current.y2) * 0.04;

      blob1.style.transform = `translate3d(${offsetRef.current.x1}px, ${offsetRef.current.y1}px, 0)`;
      blob2.style.transform = `translate3d(${offsetRef.current.x2}px, ${offsetRef.current.y2}px, 0)`;

      rafRef.current = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      window.removeEventListener('mousemove', onMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          background: baseColor,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {/* Purple blob — upper left */}
        <div
          ref={blob1Ref}
          style={{
            position: 'absolute',
            top: '-10%',
            left: '-5%',
            width: '60vw',
            height: '60vw',
            maxWidth: '700px',
            maxHeight: '700px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${blobColor1}44 0%, ${blobColor1}11 50%, transparent 70%)`,
            filter: 'blur(80px)',
            willChange: 'transform',
            animation: 'blobDrift1 20s ease-in-out infinite',
          }}
        />
        {/* Blue blob — lower right */}
        <div
          ref={blob2Ref}
          style={{
            position: 'absolute',
            bottom: '-15%',
            right: '-10%',
            width: '55vw',
            height: '55vw',
            maxWidth: '650px',
            maxHeight: '650px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${blobColor2}44 0%, ${blobColor2}11 50%, transparent 70%)`,
            filter: 'blur(80px)',
            willChange: 'transform',
            animation: 'blobDrift2 25s ease-in-out infinite',
          }}
        />
      </div>
      <style>{`
        @keyframes blobDrift1 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          33% { transform: translate3d(40px, 30px, 0) scale(1.05); }
          66% { transform: translate3d(-20px, -15px, 0) scale(0.97); }
        }
        @keyframes blobDrift2 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          33% { transform: translate3d(-35px, -25px, 0) scale(1.04); }
          66% { transform: translate3d(25px, 20px, 0) scale(0.96); }
        }
      `}</style>
    </>
  );
}
