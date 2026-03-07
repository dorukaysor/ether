/**
 * LightPillar — ReactBits background component
 * Full-screen fixed layer of animated vertical light beams.
 * Inspired by reactbits.dev / LightPillar.
 *
 * Usage: <LightPillar client:only="react" />
 */
import React from 'react';

interface Pillar {
  left: string;
  height: string;
  width: number;
  color: string;
  blur: number;
  opacity: number;
  duration: number;
  delay: number;
}

const PILLARS: Pillar[] = [
  { left: '4%',  height: '52%', width: 2, color: '#06b6d4', blur: 18, opacity: 0.14, duration: 7,    delay: 0    },
  { left: '14%', height: '72%', width: 3, color: '#06b6d4', blur: 26, opacity: 0.08, duration: 9,    delay: 1.5  },
  { left: '24%', height: '44%', width: 2, color: '#a855f7', blur: 20, opacity: 0.11, duration: 8,    delay: 0.5  },
  { left: '36%', height: '86%', width: 4, color: '#06b6d4', blur: 34, opacity: 0.09, duration: 10,   delay: 2    },
  { left: '47%', height: '60%', width: 2, color: '#06b6d4', blur: 16, opacity: 0.13, duration: 7.5,  delay: 0.8  },
  { left: '58%', height: '70%', width: 3, color: '#a855f7', blur: 22, opacity: 0.08, duration: 11,   delay: 3    },
  { left: '69%', height: '50%', width: 2, color: '#06b6d4', blur: 18, opacity: 0.12, duration: 8.5,  delay: 1    },
  { left: '80%', height: '80%', width: 3, color: '#06b6d4', blur: 30, opacity: 0.07, duration: 9.5,  delay: 2.5  },
  { left: '91%', height: '40%', width: 2, color: '#06b6d4', blur: 14, opacity: 0.10, duration: 7,    delay: 0.3  },
  { left: '97%', height: '62%', width: 2, color: '#a855f7', blur: 16, opacity: 0.06, duration: 10.5, delay: 1.8  },
];

export default function LightPillar() {
  return (
    <>
      <style>{`
        @keyframes lp-breath {
          0%, 100% { transform: scaleY(1); }
          50%       { transform: scaleY(1.1); }
        }
      `}</style>

      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          // Deep space radial gradient — darkest at top, slight deep-blue glow at bottom
          background:
            'radial-gradient(ellipse 140% 80% at 50% 110%, #050d20 0%, #02040e 55%, #000000 100%)',
        }}
      >
        {PILLARS.map((p, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              bottom: 0,
              left: p.left,
              width: `${p.width}px`,
              height: p.height,
              background: `linear-gradient(to top, ${p.color}cc 0%, ${p.color}44 50%, transparent 100%)`,
              filter: `blur(${p.blur}px)`,
              opacity: p.opacity,
              transformOrigin: 'bottom center',
              animation: `lp-breath ${p.duration}s ${p.delay}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>
    </>
  );
}
