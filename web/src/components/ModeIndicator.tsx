/**
 * ModeIndicator — shows the current data mode (LIVE / MOCK · submode)
 * as a compact pill badge. Reads from localStorage and reacts to
 * 'ether-mode-change' events dispatched by setDataMode().
 *
 * Rendered in the header nav via Layout.astro (client:only="react").
 */
import React, { useEffect, useState } from 'react';
import { getDataMode, type DataMode } from '../lib/mockData';

const LABELS: Record<string, { text: string; color: string }> = {
  'live':             { text: '⬤ LIVE',            color: '#22c55e' },
  'mock:auto':        { text: '◈ MOCK · AUTO',       color: '#f59e0b' },
  'mock:idle':        { text: '◈ MOCK · IDLE',       color: '#06b6d4' },
  'mock:happy':       { text: '◈ MOCK · HAPPY',      color: '#ec4899' },
  'mock:dizzy':       { text: '◈ MOCK · DIZZY',      color: '#eab308' },
  'mock:frustrated':  { text: '◈ MOCK · FRUSTRATED', color: '#a855f7' },
  'mock:angry':       { text: '◈ MOCK · ANGRY',      color: '#ef4444' },
};

export default function ModeIndicator() {
  const [mode, setModeState] = useState<DataMode>('live');

  useEffect(() => {
    setModeState(getDataMode());
    const sync = () => setModeState(getDataMode());
    window.addEventListener('ether-mode-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('ether-mode-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const info = LABELS[mode] ?? LABELS['live'];

  return (
    <span
      className="text-[10px] font-bold font-mono uppercase tracking-widest px-2.5 py-1 rounded-md border select-none transition-all duration-300"
      style={{
        color:       info.color,
        background:  `${info.color}14`,
        borderColor: `${info.color}35`,
      }}
    >
      {info.text}
    </span>
  );
}
