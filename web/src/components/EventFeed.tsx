import { useState, useEffect } from 'react';

interface EtherEvent {
  id: number;
  ts: Date;
  type: 'state' | 'relay' | 'alert' | 'connect';
  message: string;
  color: string;
  icon: string;
}

interface EventFeedProps {
  events: EtherEvent[];
}

export type { EtherEvent };

function age(date: Date) {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export default function EventFeed({ events }: EventFeedProps) {
  // Re-render every 15 s so relative timestamps ("5s ago") stay fresh
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 15_000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="event-feed-card">
      <div className="ef-header">
        <span className="ef-title">
          <i className="fa-solid fa-list-ul" /> Recent Events
        </span>
        <span className="ef-count">{events.length} logged</span>
      </div>

      {events.length === 0 ? (
        <p className="ef-empty">Waiting for events…</p>
      ) : (
        <ul className="ef-list">
          {events.map(e => (
            <li key={e.id} className="ef-item">
              <div
                className="ef-dot"
                style={{ background: e.color, boxShadow: `0 0 6px ${e.color}` }}
              >
                {e.icon && <i className={`fa-solid ${e.icon}`} style={{ color: e.color, fontSize: '0.6rem' }} />}
              </div>
              <div className="ef-body">
                <span className="ef-msg">{e.message}</span>
                <span className="ef-ts">{age(e.ts)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
