/**
 * TextType — ReactBits typewriter component.
 * Cycles through an array of strings, typing and deleting each.
 *
 * Usage: <TextType texts={['Hello world', 'Live data']} typingSpeed={70} />
 */
import React, { useEffect, useRef, useState } from 'react';

interface TextTypeProps {
  texts: string[];
  typingSpeed?: number;   // ms per char when typing
  deletingSpeed?: number; // ms per char when deleting
  pauseAfterType?: number;   // ms to pause after a string is fully typed
  pauseAfterDelete?: number; // ms to pause before typing next string
  className?: string;
  cursorClassName?: string;
}

export default function TextType({
  texts,
  typingSpeed = 75,
  deletingSpeed = 38,
  pauseAfterType = 2000,
  pauseAfterDelete = 400,
  className = '',
  cursorClassName = 'opacity-70',
}: TextTypeProps) {
  const [displayed, setDisplayed] = useState('');

  // Use a ref for loop state to avoid stale-closure issues inside setTimeout.
  const stateRef = useRef({ textIdx: 0, charIdx: 0, isDeleting: false });
  const textsRef = useRef(texts);
  textsRef.current = texts; // keep in sync without re-running effect

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    function tick() {
      const { textIdx, charIdx, isDeleting } = stateRef.current;
      const current = textsRef.current[textIdx];

      if (!isDeleting) {
        // Typing forward
        if (charIdx < current.length) {
          stateRef.current.charIdx += 1;
          setDisplayed(current.slice(0, stateRef.current.charIdx));
          timer = setTimeout(tick, typingSpeed);
        } else {
          // Finished typing → pause then switch to deleting
          stateRef.current.isDeleting = true;
          timer = setTimeout(tick, pauseAfterType);
        }
      } else {
        // Deleting
        if (charIdx > 0) {
          stateRef.current.charIdx -= 1;
          setDisplayed(current.slice(0, stateRef.current.charIdx));
          timer = setTimeout(tick, deletingSpeed);
        } else {
          // Finished deleting → move to next string
          stateRef.current.isDeleting = false;
          stateRef.current.textIdx =
            (textIdx + 1) % textsRef.current.length;
          timer = setTimeout(tick, pauseAfterDelete);
        }
      }
    }

    timer = setTimeout(tick, typingSpeed);
    return () => clearTimeout(timer);
  }, []); // intentionally runs once — textsRef keeps texts fresh

  return (
    <span className={className}>
      {displayed}
      <span className={`animate-pulse ${cursorClassName}`}>|</span>
    </span>
  );
}
