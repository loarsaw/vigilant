export function BracketCorners({ tone = "primary" }: { tone?: "primary" | "muted" }) {
  const color = tone === "primary" ? "border-primary" : "border-border";
  return (
    <>
      <span
        className={`absolute -top-px -left-px w-3.5 h-3.5 border-t-2 border-l-2 rounded-tl-md ${color}`}
      />
      <span
        className={`absolute -top-px -right-px w-3.5 h-3.5 border-t-2 border-r-2 rounded-tr-md ${color}`}
      />
      <span
        className={`absolute -bottom-px -left-px w-3.5 h-3.5 border-b-2 border-l-2 rounded-bl-md ${color}`}
      />
      <span
        className={`absolute -bottom-px -right-px w-3.5 h-3.5 border-b-2 border-r-2 rounded-br-md ${color}`}
      />
    </>
  );
}
