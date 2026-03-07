/**
 * Dock — ReactBits macOS-style bottom navigation with rubber-band magnification.
 * Neighbouring items scale up proportionally based on their distance to the cursor,
 * giving the classic spring/rubber effect.
 *
 * Usage: <Dock client:only="react" currentPath={Astro.url.pathname} />
 */
import React, { useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHouse,
  faChartArea,
  faBrain,
  faCircleInfo,
  faGear,
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

interface NavItem {
  icon: IconDefinition;
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: faHouse,      label: 'Home',     href: '/'         },
  { icon: faChartArea,  label: 'History',  href: '/history'  },
  { icon: faBrain,      label: 'Insights', href: '/insights' },
  { icon: faCircleInfo, label: 'About',    href: '/about'    },
  { icon: faGear,       label: 'Settings', href: '/settings' },
];

// ── Magnification parameters ────────────────────────────────────────────────
// BASE_SIZE  — resting icon button size in px
// MAX_SCALE  — maximum scale at the hovered item (1x = no change)
// SPREAD_PX  — how many px on each side "feel" the rubber pull
const BASE_SIZE  = 44;  // px
const MAX_SCALE  = 1.9;
const SPREAD_PX  = 130; // pixels of influence radius

interface DockProps {
  currentPath?: string;
}

export default function Dock({ currentPath = '/' }: DockProps) {
  const dockRef  = useRef<HTMLDivElement>(null);
  // mouseX is relative to the dock container's left edge; null when pointer is outside.
  const [mouseX, setMouseX] = useState<number | null>(null);
  // Index of item whose tooltip should be shown (nearest to cursor).
  const [tipIdx,  setTipIdx]  = useState<number | null>(null);

  const activePath = currentPath.replace(/\/$/, '') || '/';

  // ── Mouse tracking ────────────────────────────────────────────────────────
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dockRef.current) return;
    const rect = dockRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setMouseX(x);

    // Identify which item is closest to the cursor to show its tooltip.
    const gap       = 8;  // gap-2 = 8px
    const itemWidth = BASE_SIZE + gap;
    const closest   = Math.round((x - itemWidth / 2) / itemWidth);
    setTipIdx(Math.max(0, Math.min(NAV_ITEMS.length - 1, closest)));
  };

  const handleMouseLeave = () => {
    setMouseX(null);
    setTipIdx(null);
  };

  // ── Per-item scale calculation ────────────────────────────────────────────
  // We position imaginary centre points for each item and use a smooth
  // cosine-based falloff so the magnification wave looks organic.
  function getScale(itemIndex: number): number {
    if (mouseX === null) return 1;

    const gap       = 8;
    const itemWidth = BASE_SIZE + gap;
    // Centre of item in dock-local coordinates
    const itemCx = itemIndex * itemWidth + itemWidth / 2;
    const dist   = Math.abs(mouseX - itemCx);

    if (dist >= SPREAD_PX) return 1;

    // Smooth cosine taper: 1 at dist=0, 0 at dist=SPREAD_PX
    const t = (1 + Math.cos(Math.PI * (dist / SPREAD_PX))) / 2;
    return 1 + (MAX_SCALE - 1) * t;
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <nav
      ref={dockRef}
      aria-label="Main navigation"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={[
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'flex items-end px-4 py-3',
        'rounded-2xl',
        'bg-white/5 backdrop-blur-2xl',
        'border border-white/10',
        'shadow-[0_8px_32px_rgba(0,0,0,0.6)]',
      ].join(' ')}
      style={{ gap: '8px' }}
    >
      {NAV_ITEMS.map((item, i) => {
        const normHref = item.href.replace(/\/$/, '') || '/';
        const isActive = activePath === normHref;
        const isTipped = tipIdx === i && mouseX !== null;
        const scale    = getScale(i);

        // Offset the item upward proportionally to its scale so they all
        // "grow up" from the dock baseline (macOS behaviour).
        const translateY = -(scale - 1) * BASE_SIZE * 0.35;

        return (
          <a
            key={item.href}
            href={item.href}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            className="relative flex flex-col items-center"
            style={{
              transform:  `scale(${scale}) translateY(${translateY}px)`,
              transition: mouseX === null
                ? 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
                : 'transform 0.08s linear',
              transformOrigin: 'bottom center',
              width: `${BASE_SIZE}px`,
            }}
          >
            {/* Icon button */}
            <div
              className={[
                'flex items-center justify-center rounded-xl transition-colors duration-200',
                isActive
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'bg-white/5 text-white/50 border border-white/10',
              ].join(' ')}
              style={{ width: BASE_SIZE, height: BASE_SIZE }}
            >
              <FontAwesomeIcon icon={item.icon} className="text-sm" />
            </div>

            {/* Tooltip */}
            <span
              className={[
                'absolute -top-9 left-1/2 -translate-x-1/2',
                'text-[10px] font-medium text-white/80',
                'bg-black/60 backdrop-blur-sm',
                'px-2 py-0.5 rounded-md whitespace-nowrap',
                'pointer-events-none select-none',
                'transition-opacity duration-100',
                isTipped ? 'opacity-100' : 'opacity-0',
              ].join(' ')}
            >
              {item.label}
            </span>

            {/* Active indicator dot */}
            {isActive && (
              <div className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-cyan-400" />
            )}
          </a>
        );
      })}
    </nav>
  );
}

