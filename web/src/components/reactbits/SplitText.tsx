/**
 * SplitText — ReactBits character-stagger text reveal.
 * Splits the text into individual characters and fades/slides
 * each one in with a configurable stagger delay.
 *
 * Usage: <SplitText text="ETHER" staggerMs={60} />
 */
import React, { useEffect, useState } from 'react';

interface SplitTextProps {
  text: string;
  className?: string;
  charClassName?: string;
  staggerMs?: number;
}

export default function SplitText({
  text,
  className = '',
  charClassName = '',
  staggerMs = 50,
}: SplitTextProps) {
  const [revealed, setRevealed] = useState<boolean[]>([]);

  useEffect(() => {
    const chars = text.split('');
    const timers = chars.map((_, i) =>
      setTimeout(() => {
        setRevealed((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, i * staggerMs),
    );
    return () => timers.forEach(clearTimeout);
  }, [text, staggerMs]);

  return (
    <span className={className} aria-label={text}>
      {text.split('').map((char, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`inline-block transition-all duration-300 ${charClassName}`}
          style={{
            transitionDelay: `${i * staggerMs}ms`,
            opacity:   revealed[i] ? 1 : 0,
            transform: revealed[i] ? 'translateY(0)' : 'translateY(8px)',
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
}
