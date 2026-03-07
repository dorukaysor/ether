/**
 * AnimatedList — ReactBits stagger-reveal list.
 * Each child slides + fades in with a configurable stagger delay.
 * New children (keyed by count) re-trigger the animation.
 *
 * Usage:
 *   <AnimatedList staggerMs={80}>
 *     {items.map(item => <div key={item.id}>...</div>)}
 *   </AnimatedList>
 */
import React, { Children, useEffect, useState } from 'react';

interface AnimatedListProps {
  children: React.ReactNode;
  staggerMs?: number;
  className?: string;
}

export default function AnimatedList({
  children,
  staggerMs = 80,
  className = '',
}: AnimatedListProps) {
  const items = Children.toArray(children);
  const [shown, setShown] = useState(0);

  // Re-run the stagger whenever the item count changes (e.g. new insight loaded).
  useEffect(() => {
    setShown(0);
    const timers = items.map((_, i) =>
      setTimeout(() => setShown((prev) => Math.max(prev, i + 1)), i * staggerMs),
    );
    return () => timers.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, staggerMs]);

  return (
    <div className={className}>
      {items.map((child, i) => (
        <div
          key={i}
          style={{
            opacity:    i < shown ? 1 : 0,
            transform:  i < shown ? 'translateY(0)' : 'translateY(12px)',
            transition: `opacity 0.35s ease ${i * staggerMs}ms, transform 0.35s ease ${i * staggerMs}ms`,
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
