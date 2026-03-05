import React, { useEffect, useRef, memo } from 'react';

interface ReadingCardProps {
  label: string;
  value: number | null;
  unit: string;
  icon: string;
  accentColor: string;
  decimals?: number;
  loading?: boolean;
}

// Smooth number roll — writes directly to DOM, zero React re-renders during animation
function useAnimatedNumber(
  target: number | null,
  spanRef: React.RefObject<HTMLSpanElement | null>,
  decimals: number,
) {
  const rafRef  = useRef<number | undefined>(undefined);
  const fromRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === null) {
      if (spanRef.current) spanRef.current.textContent = '---';
      fromRef.current = null;
      return;
    }
    // First mount: display immediately, no animation
    if (fromRef.current === null) {
      fromRef.current = target;
      if (spanRef.current) spanRef.current.textContent = target.toFixed(decimals);
      return;
    }
    const from = fromRef.current;
    const to   = target;
    const t0   = performance.now();
    const dur  = 350;
    if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    const step = (now: number) => {
      const p    = Math.min((now - t0) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3); // easeOutCubic
      fromRef.current = from + (to - from) * ease;
      if (spanRef.current) spanRef.current.textContent = (fromRef.current as number).toFixed(decimals);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current); };
  }, [target, decimals]); // eslint-disable-line react-hooks/exhaustive-deps
}

const ReadingCard = memo(function ReadingCard({
  label, value, unit, icon, accentColor, decimals = 2, loading = false,
}: ReadingCardProps) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const prevRef = useRef<number | null>(null);
  const trend   = value !== null && prevRef.current !== null ? value - prevRef.current : 0;
  useAnimatedNumber(value, spanRef, decimals);
  useEffect(() => { if (value !== null) prevRef.current = value; }, [value]);

  if (loading) {
    return (
      <div className="reading-card loading" style={{ '--accent': accentColor } as React.CSSProperties}>
        <div className="rc-icon-wrap skeleton-box" style={{ width: 40, height: 40 }} />
        <div className="rc-body" style={{ flex: 1 }}>
          <div className="skeleton-box" style={{ width: '55%', height: 10, borderRadius: 4, marginBottom: 8 }} />
          <div className="skeleton-box" style={{ width: '80%', height: 28, borderRadius: 6 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="reading-card" style={{ '--accent': accentColor } as React.CSSProperties}>
      <div className="rc-icon-wrap">
        <i className={`fa-solid ${icon}`} />
      </div>
      <div className="rc-body">
        <span className="rc-label">{label}</span>
        <div className="rc-value-row">
          <span ref={spanRef} className="rc-value" />
          <span className="rc-unit">{unit}</span>
          {trend !== 0 && (
            <span className={`rc-delta ${trend > 0 ? 'up' : 'down'}`}>
              {trend > 0 ? '▲' : '▼'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

export default ReadingCard;
