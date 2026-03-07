/**
 * CountUp — ReactBits animated number counter.
 * Smoothly animates from the previous value to the new one
 * whenever the `value` prop changes. Uses requestAnimationFrame.
 *
 * Usage: <CountUp value={223.4} decimals={1} suffix=" V" />
 */
import React, { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  value: number;
  decimals?: number;
  duration?: number; // ms
  suffix?: string;
  prefix?: string;
  className?: string;
}

export default function CountUp({
  value,
  decimals = 2,
  duration = 700,
  suffix = '',
  prefix = '',
  className = '',
}: CountUpProps) {
  const [display, setDisplay] = useState(value);
  // Track where the animation currently is so interrupted anims start smoothly.
  const fromRef = useRef(value);
  const rafRef  = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to   = value;
    if (from === to) return;

    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed  = now - startTime;
      const t        = Math.min(elapsed / duration, 1);
      const eased    = 1 - Math.pow(1 - t, 3); // ease-out cubic
      const current  = from + (to - from) * eased;

      fromRef.current = current;
      setDisplay(current);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
        setDisplay(to);
      }
    };

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return (
    <span className={className}>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}
