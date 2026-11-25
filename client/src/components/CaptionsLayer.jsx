// CaptionsLayer.jsx — opt-in, on-device live captions + recap over the video stage.
import React, { useMemo, useState } from 'react';
import { ClosedCaptioning } from '@phosphor-icons/react';
import { useLiveCaptions } from '../hooks/useLiveCaptions';
import { buildRecap, toMarkdown } from '../ai/recap';

const chip = {
  background: 'rgba(15, 23, 42, 0.75)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(255,255,255,0.15)',
  color: '#fff',
  borderRadius: 8,
  padding: '6px 10px',
  fontSize: 13,
  cursor: 'pointer',
};

export function CaptionsLayer({ stream }) {
  const [on, setOn] = useState(false);
  const [translate, setTranslate] = useState(false);
  const { status, progress, captions, error } = useLiveCaptions(stream, { enabled: on, translate });
  const last = captions[captions.length - 1];

  const download = () => {
    const md = toMarkdown(buildRecap(captions));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    a.download = 'screenloop-recap.md';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const hasRecap = useMemo(() => captions.length > 0, [captions]);

  const note =
    status === 'unsupported' ? 'Captions need a newer browser (WebAssembly + Web Workers).'
    : status === 'loading' ? `Loading on-device caption model… ${progress}%`
    : status === 'error' ? `Captions stopped: ${error}`
    : status === 'ready' && !last ? 'Listening… (audio stays on your device)'
    : '';

  return (
    <>
      <div style={{ position: 'absolute', top: 14, left: 14, zIndex: 15, display: 'flex', gap: 8 }}>
        <button
          type="button"
          style={{ ...chip, color: on ? 'var(--color-primary, #818cf8)' : '#fff', display: 'flex', gap: 6, alignItems: 'center' }}
          aria-pressed={on}
          aria-label="Toggle live captions"
          title="On-device live captions (nothing is uploaded)"
          onClick={() => setOn((v) => !v)}
        >
          <ClosedCaptioning size={18} weight={on ? 'fill' : 'regular'} /> CC
        </button>
        {on && (
          <label style={{ ...chip, display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={translate} onChange={(e) => setTranslate(e.target.checked)} />
            Translate to English
          </label>
        )}
        {hasRecap && (
          <button type="button" style={chip} onClick={download} title="Download an on-device recap (.md)">
            Recap
          </button>
        )}
      </div>

      {on && (last || note) && (
        <div
          role="status"
          data-testid="captions"
          aria-live="polite"
          style={{
            position: 'absolute', left: '50%', bottom: 90, transform: 'translateX(-50%)', zIndex: 15,
            maxWidth: '80%', padding: '8px 14px', borderRadius: 8, textAlign: 'center',
            background: 'rgba(0,0,0,0.78)', color: '#fff', fontSize: 18, lineHeight: 1.35,
          }}
        >
          {status === 'ready' && last ? last.text : note}
        </div>
      )}
    </>
  );
}
