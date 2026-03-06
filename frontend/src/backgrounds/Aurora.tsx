// Aurora gradient background — shifting neon plasma
import React, { useEffect, useRef } from 'react';

export const displayName = 'Aurora';

const Aurora: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // inject keyframes once
    const id = 'aurora-keyframes';
    if (!document.getElementById(id)) {
      const s = document.createElement('style');
      s.id = id;
      s.textContent = `
        @keyframes aurora-shift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes aurora-blob1 {
          0%, 100% { transform: translate(0,0) scale(1); }
          33%       { transform: translate(6%,4%) scale(1.06); }
          66%       { transform: translate(-4%,6%) scale(0.96); }
        }
        @keyframes aurora-blob2 {
          0%, 100% { transform: translate(0,0) scale(1); }
          40%       { transform: translate(-7%,-4%) scale(1.08); }
          70%       { transform: translate(5%,-3%) scale(0.94); }
        }
      `;
      document.head.appendChild(s);
    }
  }, []);

  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.55 }}>
      {/* blob 1 — cyan */}
      <div style={{
        position: 'absolute',
        width: '70vw', height: '70vw',
        top: '-20vw', left: '-10vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,245,255,0.28) 0%, transparent 70%)',
        filter: 'blur(60px)',
        animation: 'aurora-blob1 18s ease-in-out infinite',
      }} />
      {/* blob 2 — pink */}
      <div style={{
        position: 'absolute',
        width: '65vw', height: '65vw',
        top: '10vw', right: '-15vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,45,120,0.22) 0%, transparent 70%)',
        filter: 'blur(55px)',
        animation: 'aurora-blob2 22s ease-in-out infinite',
      }} />
      {/* blob 3 — purple */}
      <div style={{
        position: 'absolute',
        width: '55vw', height: '55vw',
        bottom: '-15vw', left: '25vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(180,79,255,0.18) 0%, transparent 70%)',
        filter: 'blur(70px)',
        animation: 'aurora-blob1 26s ease-in-out infinite reverse',
      }} />
    </div>
  );
};

export default Aurora;
