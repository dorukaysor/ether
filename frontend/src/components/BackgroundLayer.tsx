/**
 * BackgroundLayer — auto-discovers all .tsx files in src/backgrounds/,
 * reads the current preference from localStorage('ether:bgStyle'),
 * and renders it as a fixed full-screen layer behind all content.
 *
 * Listens for the 'ether:bgchange' custom event to switch at runtime.
 */
import React, { useState, useEffect, type ComponentType } from 'react';

// Eagerly import every background module
const RAW_MODULES = import.meta.glob('../backgrounds/*.tsx', { eager: true }) as Record<
  string,
  { default: ComponentType; displayName?: string }
>;

export interface BgOption {
  id: string;           // key stored in localStorage, e.g. "Aurora"
  label: string;        // human-readable, e.g. "Aurora"
  component: ComponentType;
}

/** Sorted list of available backgrounds — use in the Settings selector. */
export const bgOptions: BgOption[] = Object.entries(RAW_MODULES)
  .map(([path, mod]) => {
    const id = path.replace('../backgrounds/', '').replace('.tsx', '');
    const label = mod.displayName ?? id;
    return { id, label, component: mod.default };
  })
  .sort((a, b) => {
    // Keep NoBg first
    if (a.id === 'NoBg') return -1;
    if (b.id === 'NoBg') return 1;
    return a.label.localeCompare(b.label);
  });

const BG_MAP = Object.fromEntries(bgOptions.map(o => [o.id, o.component]));
const BG_KEY = 'ether:bgStyle';
const BG_EVENT = 'ether:bgchange';

function readPref(): string {
  try { return localStorage.getItem(BG_KEY) || 'NoBg'; } catch { return 'NoBg'; }
}

/** Persist + broadcast a background change. Call this from the Settings selector. */
export function setBgStyle(id: string): void {
  try { localStorage.setItem(BG_KEY, id); } catch {}
  window.dispatchEvent(new CustomEvent(BG_EVENT));
}

/** The fixed background layer — mount once in Layout. */
const BackgroundLayer: React.FC = () => {
  const [current, setCurrent] = useState<string>(readPref);

  useEffect(() => {
    const handler = () => setCurrent(readPref());
    window.addEventListener(BG_EVENT, handler);
    return () => window.removeEventListener(BG_EVENT, handler);
  }, []);

  const Bg = BG_MAP[current] ?? BG_MAP['NoBg'];
  if (!Bg) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <Bg />
    </div>
  );
};

export default BackgroundLayer;
