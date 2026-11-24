// ThemeSelector.jsx — Accessible theme switcher with smooth color transitions
import React, { useEffect, useState } from 'react';

const THEMES = [
  { id: 'light', label: 'Light', color: '#F7F6F3', border: '#777' },
  { id: 'midnight', label: 'Dark', color: '#292433', border: '#fff' },
];

export function ThemeSelector() {
  const [activeTheme, setActiveTheme] = useState('midnight');

  useEffect(() => {
    const saved = localStorage.getItem('screenloop-theme') === 'light' ? 'light' : 'midnight';
    setActiveTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  const handleSelect = (themeId) => {
    setActiveTheme(themeId);
    localStorage.setItem('screenloop-theme', themeId);
    document.documentElement.setAttribute('data-theme', themeId);
  };

  return (
    <div className="theme-selector-container" role="group" aria-label="Theme Selector">
      <span className="theme-selector-label">Theme:</span>
      <div className="theme-pills-row">
        {THEMES.map((theme) => {
          const isSelected = activeTheme === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              className={`theme-dot-btn ${isSelected ? 'selected' : ''}`}
              title={theme.label}
              aria-label={`Select ${theme.label} Theme`}
              aria-pressed={isSelected}
              onClick={() => handleSelect(theme.id)}
              style={{
                backgroundColor: theme.color,
                borderColor: isSelected
                  ? 'var(--text-primary)'
                  : theme.border
                  ? theme.border
                  : 'transparent',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
