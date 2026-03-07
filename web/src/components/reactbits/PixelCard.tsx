/**
 * PixelCard — ReactBits settings group card.
 * A glass card with a subtle animated dot-grid pattern on hover,
 * giving it a "pixel / circuit board" aesthetic.
 *
 * Usage:
 *   <PixelCard title="Dashboard" icon={faCog}>
 *     ...children
 *   </PixelCard>
 */
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

interface PixelCardProps {
  title:    string;
  icon?:    IconDefinition;
  children: React.ReactNode;
  accentColor?: string;
}

export default function PixelCard({
  title,
  icon,
  children,
  accentColor = '#06b6d4',
}: PixelCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative overflow-hidden rounded-2xl border transition-all duration-300"
      style={{
        background:   'rgba(255,255,255,0.03)',
        borderColor:  hovered ? `${accentColor}35` : 'rgba(255,255,255,0.08)',
        boxShadow:    hovered ? `0 0 32px ${accentColor}12` : 'none',
      }}
    >
      {/* Dot-grid overlay — visible on hover */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none transition-opacity duration-500"
        style={{
          opacity: hovered ? 1 : 0,
          backgroundImage: `radial-gradient(circle, ${accentColor}22 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        }}
      />

      {/* Top accent line */}
      <div
        className="absolute top-0 inset-x-0 h-px transition-opacity duration-300"
        style={{
          background: `linear-gradient(to right, transparent, ${accentColor}60, transparent)`,
          opacity: hovered ? 1 : 0,
        }}
      />

      {/* Content */}
      <div className="relative p-6">
        {/* Card header */}
        <div className="flex items-center gap-2.5 mb-5">
          {icon && (
            <div
              className="w-7 h-7 flex items-center justify-center rounded-lg"
              style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}30` }}
            >
              <FontAwesomeIcon icon={icon} className="w-3 h-3" style={{ color: accentColor }} />
            </div>
          )}
          <h3 className="text-sm font-semibold text-white/80 tracking-wide">{title}</h3>
        </div>

        {children}
      </div>
    </div>
  );
}
