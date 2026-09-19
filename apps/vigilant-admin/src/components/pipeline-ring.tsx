export function PipelineRing({
  value,
  label,
  sub,
  colorVar,
}: {
  value: number;
  label: string;
  sub: string;
  colorVar: string;
}) {
  const pct = value > 0 ? 100 : 0;
  return (
    <div className="text-center">
      <div
        className="relative h-28 w-28 rounded-full flex items-center justify-center mx-auto mb-3"
        style={{
          background: `conic-gradient(hsl(${colorVar}) ${pct}%, hsl(var(--border)) 0)`,
        }}
      >
        <div className="absolute inset-[7px] rounded-full bg-card" />
        <p className="relative font-display text-3xl font-bold text-foreground">{value}</p>
      </div>
      <p className="font-display font-semibold text-foreground">{label}</p>
      <p className="text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}
