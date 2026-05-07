interface Point {
  date: string;
  score: number;
}

interface Props {
  points: Point[];
  height?: number;
}

export function TrendChart({ points, height = 180 }: Props) {
  if (points.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-slate-muted font-body text-sm"
        style={{ height }}
      >
        {points.length === 0
          ? 'No completed sessions yet.'
          : 'Need at least 2 sessions to show a trend.'}
      </div>
    );
  }

  const PAD_X = 28;
  const PAD_Y = 18;
  const W = 600;
  const H = height;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;

  const xs = points.map((_, i) => i);
  const ys = points.map(p => p.score);
  const yMin = 0;
  const yMax = 100;

  const scaleX = (i: number) =>
    PAD_X + (xs.length === 1 ? innerW / 2 : (i / (xs.length - 1)) * innerW);
  const scaleY = (v: number) => PAD_Y + ((yMax - v) / (yMax - yMin)) * innerH;

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)} ${scaleY(p.score).toFixed(1)}`)
    .join(' ');

  // Smoother area fill under the line
  const areaPath =
    `${path} L ${scaleX(points.length - 1).toFixed(1)} ${scaleY(0).toFixed(1)} L ${scaleX(0).toFixed(1)} ${scaleY(0).toFixed(1)} Z`;

  // Y-axis gridlines at 0/50/100
  const gridYs = [0, 50, 100];

  // Mean
  const mean = ys.reduce((a, b) => a + b, 0) / ys.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
      {/* Gridlines */}
      {gridYs.map(g => (
        <g key={g}>
          <line
            x1={PAD_X}
            x2={W - PAD_X}
            y1={scaleY(g)}
            y2={scaleY(g)}
            stroke="#1A2B4A"
            strokeWidth={1}
          />
          <text
            x={PAD_X - 6}
            y={scaleY(g) + 3}
            textAnchor="end"
            className="fill-slate-muted"
            style={{ fontSize: 10, fontFamily: 'system-ui' }}
          >
            {g}
          </text>
        </g>
      ))}

      {/* Mean line */}
      <line
        x1={PAD_X}
        x2={W - PAD_X}
        y1={scaleY(mean)}
        y2={scaleY(mean)}
        stroke="#C9A84C"
        strokeOpacity={0.3}
        strokeWidth={1}
        strokeDasharray="3 3"
      />

      {/* Area */}
      <path d={areaPath} fill="#C9A84C" fillOpacity={0.1} />

      {/* Line */}
      <path d={path} fill="none" stroke="#C9A84C" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {/* Points */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={scaleX(i)}
          cy={scaleY(p.score)}
          r={3.5}
          fill="#C9A84C"
          stroke="#0F172A"
          strokeWidth={2}
        >
          <title>{`${new Date(p.date).toLocaleDateString()} — ${p.score}`}</title>
        </circle>
      ))}
    </svg>
  );
}
