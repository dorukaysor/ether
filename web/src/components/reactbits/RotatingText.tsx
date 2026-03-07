/**
 * RotatingText — ReactBits subtitle rotator.
 * Cross-fades between an array of strings with a slide-up animation.
 *
 * Usage: <RotatingText texts={['Analyzing energy', 'Powered by Gemini']} intervalMs={3000} />
 */
import React, { useEffect, useState } from 'react';

interface RotatingTextProps {
  texts: string[];
  intervalMs?: number;
  className?: string;
}

export default function RotatingText({
  texts,
  intervalMs = 3200,
  className = '',
}: RotatingTextProps) {
  const [idx,     setIdx]     = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (texts.length <= 1) return;

    const timer = setInterval(() => {
      // Fade out → swap text → fade in.
      setVisible(false);
      setTimeout(() => {
        setIdx((prev) => (prev + 1) % texts.length);
        setVisible(true);
      }, 320); // half the CSS transition duration
    }, intervalMs);

    return () => clearInterval(timer);
  }, [texts, intervalMs]);

  return (
    <span
      className={className}
      style={{
        display:    'inline-block',
        opacity:    visible ? 1 : 0,
        transform:  visible ? 'translateY(0)' : 'translateY(-6px)',
        transition: 'opacity 0.32s ease, transform 0.32s ease',
      }}
    >
      {texts[idx]}
    </span>
  );
}
