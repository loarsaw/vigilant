import { BracketCorners } from "@/components/bracket-conner";
import { Card, CardContent } from "@/components/ui/card";
import { ReactNode } from "react";


export function StatCard({
  label,
  value,
  icon,
  tone = "primary",
  note,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone?: "primary" | "muted";
  note?: string;
}) {
  return (
    <Card className="relative border-border/60 bg-card">
      <BracketCorners tone={tone} />
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>
            <p className="font-display text-3xl font-bold text-foreground">{value}</p>
            {note && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{note}</p>}
          </div>
          <div className="h-8 w-8 rounded-md bg-input border border-border flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
