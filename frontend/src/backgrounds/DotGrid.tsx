// Animated radial dot grid background
import React, { useEffect, useRef } from 'react';

export const displayName = 'Dot Grid';

const DotGrid: React.FC = () => {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = divRef.current;
    if (!el) return;
    let x = 0, y = 0;
    const onMove = (e: MouseEvent) => {
      x = e.clientX / window.innerWidth;
      y = e.clientY / window.innerHeight;
      el.style.setProperty('--mx', `${x * 100}%`);
      el.style.setProperty('--my', `${y * 100}%`);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div
      ref={divRef}
      style={{
        position: 'absolute',
        inset: 0,
        '--mx': '50%',
        '--my': '50%',

        /* dot pattern */
        backgroundImage: 'radial-gradient(circle, rgba(0,245,255,0.18) 1px, transparent 1px)',
        backgroundSize: '28px 28px',

        /* mouse-reactive radial fade */
        maskImage: 'radial-gradient(ellipse 60% 60% at var(--mx) var(--my), black 20%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse 60% 60% at var(--mx) var(--my), black 20%, transparent 80%)',
      } as React.CSSProperties}
    />
  );
};

export default DotGrid;
