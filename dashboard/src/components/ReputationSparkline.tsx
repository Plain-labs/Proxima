import { useId } from "react";

// ─── ReputationSparkline ──────────────────────────────────────────────────────
// Renders a minimal SVG sparkline showing reputation score history.
// No external chart library is used — only native SVG primitives.

interface ReputationSparklineProps {
  /** Array of reputation scores (0–10000) ordered oldest → newest */
  history: number[];
  /** Width of the SVG in pixels */
  width?: number;
  /** Height of the SVG in pixels */
  height?: number;
}

export default function ReputationSparkline({
  history,
  width = 200,
  height = 40,
}: ReputationSparklineProps) {
  const instanceId = useId();

  if (!history || history.length < 2) return null;

  const first = history[0];
  const last = history[history.length - 1];

  // Trend colour: green = up, red = down, blue = stable (within 0.5%)
  const delta = last - first;
  const stableThreshold = first * 0.005; // 0.5% of the starting score
  const lineColor =
    Math.abs(delta) <= stableThreshold
      ? "#00c8ff"
      : delta > 0
      ? "#00ff78"
      : "#ff4060";

  // Glow / fill colours derive from the line colour
  const fillColor =
    Math.abs(delta) <= stableThreshold
      ? "rgba(0,200,255,"
      : delta > 0
      ? "rgba(0,255,120,"
      : "rgba(255,64,96,";

  // Compute normalised (x, y) pixel coordinates
  const padding = { x: 2, y: 4 };
  const chartW = width - padding.x * 2;
  const chartH = height - padding.y * 2;

  const minVal = Math.min(...history);
  const maxVal = Math.max(...history);
  const range = maxVal - minVal || 1; // guard against flat line

  const points = history.map((v, i) => {
    const x = padding.x + (i / (history.length - 1)) * chartW;
    const y = padding.y + chartH - ((v - minVal) / range) * chartH;
    return { x, y };
  });

  // Build the polyline points string
  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Area fill path: line + drop down to baseline + close
  const areaPath = [
    `M ${points[0].x},${points[0].y}`,
    ...points.slice(1).map((p) => `L ${p.x},${p.y}`),
    `L ${points[points.length - 1].x},${padding.y + chartH}`,
    `L ${points[0].x},${padding.y + chartH}`,
    "Z",
  ].join(" ");

  // Latest-score dot position
  const dotX = points[points.length - 1].x;
  const dotY = points[points.length - 1].y;

  // Stable gradient id (avoids conflicts when multiple sparklines render)
  const gradId = `spark-grad-${instanceId}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block", overflow: "visible" }}
      aria-label="Reputation history sparkline"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity={0.25} />
          <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Area fill */}
      <path
        d={areaPath}
        fill={`url(#${gradId})`}
        stroke="none"
      />

      {/* Main sparkline */}
      <polyline
        points={polylinePoints}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 3px ${lineColor}88)` }}
      />

      {/* Latest-score dot — outer glow ring */}
      <circle
        cx={dotX}
        cy={dotY}
        r={4}
        fill={`${fillColor}0.15)`}
        stroke={lineColor}
        strokeWidth="1"
      />

      {/* Latest-score dot — inner solid */}
      <circle
        cx={dotX}
        cy={dotY}
        r={2}
        fill={lineColor}
        style={{ filter: `drop-shadow(0 0 4px ${lineColor})` }}
      />
    </svg>
  );
}
