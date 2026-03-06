import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';

interface SparkPoint { t: number; power: number; }

interface PowerSparklineProps {
  data: SparkPoint[];
  color: string;
}

function MiniTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="spark-tooltip">
      {payload[0].value.toFixed(1)} W
    </div>
  );
}

export default function PowerSparkline({ data, color }: PowerSparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data.map(d => d.power));
  const max = Math.max(...data.map(d => d.power));
  const delta = max - min;

  return (
    <div className="sparkline-card">
      <div className="sparkline-meta">
        <span className="sparkline-label">
          <i className="fa-solid fa-chart-line" /> Power Trend
        </span>
        <div className="sparkline-range">
          <span style={{ color: '#6b6b8a' }}>min</span>
          <span style={{ color }}>{min.toFixed(0)} W</span>
          <span style={{ color: '#6b6b8a', margin: '0 0.15rem' }}>·</span>
          <span style={{ color: '#6b6b8a' }}>max</span>
          <span style={{ color }}>{max.toFixed(0)} W</span>
          <span style={{ color: '#6b6b8a', margin: '0 0.15rem' }}>·</span>
          <span style={{ color: '#6b6b8a' }}>Δ</span>
          <span style={{ color: delta > 100 ? '#ffe600' : color }}>{delta.toFixed(0)} W</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={72}>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="power"
            stroke={color}
            strokeWidth={1.5}
            fill="url(#sparkGrad)"
            dot={false}
            isAnimationActive={false}
          />
          <Tooltip content={<MiniTooltip />} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
