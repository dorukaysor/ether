// Subtle grid lines background with neon glow
import React, { useEffect, useRef } from 'react';

export const displayName = 'Grid Lines';

const GridLines: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = 'gridlines-keyframes';
    if (!document.getElementById(id)) {
      const s = document.createElement('style');
      s.id = id;
      s.textContent = `
        @keyframes gridlines-pulse {
          0%, 100% { opacity: 0.45; }
          50%       { opacity: 0.65; }
        }
      `;
      document.head.appendChild(s);
    }
  }, []);

  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0 }}>
      {/* Horizontal + vertical lines via gradient */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0,245,255,0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,245,255,0.06) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
        animation: 'gridlines-pulse 6s ease-in-out infinite',
      }} />
      {/* Centre radial glow */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 50% 40% at 50% 50%, rgba(0,245,255,0.05) 0%, transparent 70%)',
      }} />
    </div>
  );
};

export default GridLines;
