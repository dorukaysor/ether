import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import './ChromaGrid.css';

export interface ReadingItem {
  key: string;
  label: string;
  value: number | null;
  unit: string;
  icon: string;
  accentColor: string;
  decimals: number;
  loading?: boolean;
}

interface ChromaGridProps {
  items: ReadingItem[];
  radius?: number;
  damping?: number;
  fadeOut?: number;
  ease?: string;
}

type SetterFn = (v: number | string) => void;

const ChromaGrid: React.FC<ChromaGridProps> = ({
  items,
  radius = 280,
  damping = 0.45,
  fadeOut = 0.6,
  ease = 'power3.out',
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);
  const setX = useRef<SetterFn | null>(null);
  const setY = useRef<SetterFn | null>(null);
  const pos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    setX.current = gsap.quickSetter(el, '--x', 'px') as SetterFn;
    setY.current = gsap.quickSetter(el, '--y', 'px') as SetterFn;
    const { width, height } = el.getBoundingClientRect();
    pos.current = { x: width / 2, y: height / 2 };
    setX.current(pos.current.x);
    setY.current(pos.current.y);
  }, []);

  const moveTo = (x: number, y: number) => {
    gsap.to(pos.current, {
      x, y,
      duration: damping,
      ease,
      onUpdate: () => {
        setX.current?.(pos.current.x);
        setY.current?.(pos.current.y);
      },
      overwrite: true,
    });
  };

  const handleMove = (e: React.PointerEvent) => {
    const r = rootRef.current!.getBoundingClientRect();
    moveTo(e.clientX - r.left, e.clientY - r.top);
    gsap.to(fadeRef.current, { opacity: 0, duration: 0.25, overwrite: true });
  };

  const handleLeave = () => {
    gsap.to(fadeRef.current, { opacity: 1, duration: fadeOut, overwrite: true });
  };

  const handleCardMove = (e: React.MouseEvent<HTMLElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  const fmt = (value: number | null, decimals: number): string => {
    if (value === null) return '—';
    return value.toFixed(decimals);
  };

  return (
    <div
      ref={rootRef}
      className="rc-chroma-grid"
      style={{ '--r': `${radius}px` } as React.CSSProperties}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      {items.map(item => (
        <article
          key={item.key}
          className="rc-chroma-card"
          onMouseMove={handleCardMove}
          style={{
            '--card-border': item.accentColor,
            background: `linear-gradient(155deg, ${item.accentColor}18 0%, var(--bg-card) 60%)`,
          } as React.CSSProperties}
        >
          {/* Per-card mouse spotlight */}
          <div className="rc-spotlight" />

          <div className="rc-card-body">
            {item.loading ? (
              <div className="rc-skeleton" />
            ) : (
              <>
                <div className="rc-icon" style={{ color: item.accentColor }}>
                  <i className={`fa-solid ${item.icon}`} />
                </div>
                <div className="rc-value-row">
                  <span className="rc-value">{fmt(item.value, item.decimals)}</span>
                  {item.unit && <span className="rc-unit">{item.unit}</span>}
                </div>
                <div className="rc-label">{item.label}</div>
              </>
            )}
          </div>
        </article>
      ))}

      {/* Container-level grayscale mask — spotlight punches through it */}
      <div className="rc-chroma-overlay" />
      {/* GSAP-animated fade: full grayscale on mouse-leave, clears on hover */}
      <div ref={fadeRef} className="rc-chroma-fade" />
    </div>
  );
};

export default ChromaGrid;
