import { useMemo } from "react";

export interface RadarChartAxis {
  label: string;
  value: number | null;
}

interface RadarChartProps {
  axes: RadarChartAxis[];
  max?: number;
  size?: number;
}

export function RadarChart({ axes, max = 100, size = 280 }: RadarChartProps) {
  const center = size / 2;
  const radius = size / 2 - 60;
  const rings = [0.25, 0.5, 0.75, 1];

  const hasAnyData = axes.some((a) => a.value !== null && a.value !== undefined);

  const points = useMemo(() => {
    const n = axes.length;
    return axes.map((axis, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const ratio = Math.max(0, Math.min(1, (axis.value ?? 0) / max));
      const x = center + radius * ratio * Math.cos(angle);
      const y = center + radius * ratio * Math.sin(angle);
      const labelX = center + (radius + 32) * Math.cos(angle);
      const labelY = center + (radius + 32) * Math.sin(angle);

      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      let textAnchor: "start" | "middle" | "end" = "middle";
      if (cos > 0.3) textAnchor = "start";
      else if (cos < -0.3) textAnchor = "end";

      let dominantBaseline: "auto" | "middle" | "hanging" = "middle";
      if (sin < -0.3) dominantBaseline = "auto";
      else if (sin > 0.3) dominantBaseline = "hanging";

      return { x, y, labelX, labelY, angle, axis, textAnchor, dominantBaseline };
    });
  }, [axes, center, radius, max]);

  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  if (!hasAnyData) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ width: size, height: size }}
      >
        No interview feedback yet
      </div>
    );
  }

  const labelPadding = 56;
  const viewBoxWidth = size + labelPadding * 2;
  const viewBoxHeight = size + 16;
  const offsetX = labelPadding;
  const offsetY = 8;

  return (
    <svg
      width={viewBoxWidth}
      height={viewBoxHeight}
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
    >
      <g transform={`translate(${offsetX}, ${offsetY})`}>
        {/* reference rings */}
        {rings.map((r) => (
          <polygon
            key={r}
            points={axes
              .map((_, i) => {
                const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
                const x = center + radius * r * Math.cos(angle);
                const y = center + radius * r * Math.sin(angle);
                return `${x},${y}`;
              })
              .join(" ")}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.15}
          />
        ))}

        {/* spokes */}
        {points.map((p, i) => (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={center + radius * Math.cos(p.angle)}
            y2={center + radius * Math.sin(p.angle)}
            stroke="currentColor"
            strokeOpacity={0.15}
          />
        ))}

        {/* data shape */}
        <polygon
          points={polygonPoints}
          fill="currentColor"
          fillOpacity={0.25}
          stroke="currentColor"
          strokeWidth={2}
          className="text-primary"
        />

        {/* data points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="currentColor" className="text-primary" />
        ))}

        {/* labels */}
        {points.map((p, i) => (
          <text
            key={i}
            x={p.labelX}
            y={p.labelY}
            fontSize={11}
            textAnchor={p.textAnchor}
            dominantBaseline={p.dominantBaseline}
            fill="currentColor"
            className="text-muted-foreground"
          >
            {p.axis.label}
            {p.axis.value !== null && p.axis.value !== undefined
              ? ` (${Math.round(p.axis.value)})`
              : ""}
          </text>
        ))}
      </g>
    </svg>
  );
}
