interface State {
  id: string;
  label: string;
  color: string;
  icon: string;
  desc: string;
}

const STATES: State[] = [
  { id: 'idle',       label: 'Idle',       color: '#00f5ff', icon: 'fa-circle-dot',   desc: '50 – 300 W' },
  { id: 'happy',      label: 'Happy',      color: '#ff2d78', icon: 'fa-heart',         desc: 'Power drop detected' },
  { id: 'dizzy',      label: 'Dizzy',      color: '#ffe600', icon: 'fa-bolt-lightning',desc: 'Fluctuations / spikes' },
  { id: 'frustrated', label: 'Frustrated', color: '#b44fff', icon: 'fa-skull',         desc: '>1000 W for >15 min' },
  { id: 'angry',      label: 'Angry',      color: '#ff2020', icon: 'fa-triangle-exclamation', desc: '>2500 W — relay off' },
];

interface EmotiveStateProps {
  state: string;  // one of the ids above
  watts: number | null;
}

export default function EmotiveState({ state, watts }: EmotiveStateProps) {
  const current = STATES.find(s => s.id === state) ?? STATES[0];

  return (
    <div className="emotive-container">
      <div
        className="emotive-badge"
        style={{
          '--state-color': current.color,
          borderColor: current.color,
          boxShadow: `0 0 18px ${current.color}55`,
        } as React.CSSProperties}
      >
        <i className={`fa-solid ${current.icon} emotive-icon`} style={{ color: current.color }} />
        <div className="emotive-text">
          <span className="emotive-label" style={{ color: current.color }}>{current.label}</span>
          <span className="emotive-desc">{current.desc}</span>
        </div>
        {watts !== null && (
          <span className="emotive-watts">{watts.toFixed(0)} W</span>
        )}
      </div>

      <div className="emotive-dots">
        {STATES.map(s => (
          <div
            key={s.id}
            title={s.label}
            className={`emotive-dot ${s.id === state ? 'active' : ''}`}
            style={{
              backgroundColor: s.id === state ? s.color : '#1e1e3a',
              boxShadow: s.id === state ? `0 0 8px ${s.color}` : 'none',
            }}
          />
        ))}
      </div>
    </div>
  );
}
