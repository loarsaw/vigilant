import { AlertTriangle, CheckCircle, Terminal } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProcessReports } from "@/hooks/use-process-report";

export function SystemDiagnostics({ sessionId }: { sessionId: string | null }) {
  const { reports, latest, hasAnyAlerts, hasUnknownProcesses, isLoading } =
    useProcessReports(sessionId);

  const connected = reports.length > 0;

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="font-display text-lg tracking-wide flex items-center gap-2">
          <Terminal className="h-5 w-5 text-primary" />
          System Diagnostics
          {connected && (
            <span className="ml-auto flex items-center gap-1.5">
              {hasUnknownProcesses ? (
                <Badge className="bg-[hsl(var(--destructive)/0.15)] text-[hsl(var(--destructive))] border border-[hsl(var(--destructive)/0.3)] font-display font-semibold tracking-wide animate-pulse">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Unknown Process Detected
                </Badge>
              ) : hasAnyAlerts ? (
                <Badge className="bg-[hsl(var(--chart-3)/0.15)] text-[hsl(var(--chart-3))] border border-[hsl(var(--chart-3)/0.3)] font-display font-semibold tracking-wide">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Alerts Active
                </Badge>
              ) : (
                <Badge className="bg-[hsl(var(--chart-4)/0.15)] text-[hsl(var(--chart-4))] border border-[hsl(var(--chart-4)/0.3)] font-display font-semibold tracking-wide">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  All Clear
                </Badge>
              )}
            </span>
          )}
        </CardTitle>
        <CardDescription>Real-time telemetry from candidate client</CardDescription>
      </CardHeader>

      <CardContent>
        {!connected ? (
          <div className="flex items-center justify-center p-8 border-2 border-dashed border-border/60 rounded-lg">
            <p className="text-muted-foreground italic text-sm text-center">
              {isLoading ? "Loading telemetry..." : "Waiting for candidate to connect to session..."}
              <br />
              (Telemetry will appear once session is initialized)
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {/* Summary row */}
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
              <span>{latest?.processes.length ?? 0} processes running</span>
              <span>
                Last updated: {latest ? new Date(latest.timestamp).toLocaleTimeString() : "—"}
              </span>
            </div>

            {/* Process list */}
            {latest?.processes.map((p) => (
              <div
                key={p.pid}
                className={`flex items-center justify-between rounded-md px-3 py-2 text-sm border transition-colors
                  ${
                    p.status === "unknown"
                      ? "bg-[hsl(var(--destructive)/0.08)] border-[hsl(var(--destructive)/0.25)]"
                      : "bg-muted/40 border-transparent"
                  }`}
              >
                <div className="flex items-center gap-2">
                  {p.status === "unknown" && (
                    <AlertTriangle className="h-3.5 w-3.5 text-[hsl(var(--destructive))] shrink-0" />
                  )}
                  <span className={`font-medium ${p.color ?? "text-foreground/80"}`}>{p.name}</span>
                  <span className="text-muted-foreground text-xs">PID {p.pid}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">{p.memory.toFixed(1)} MB</span>
                  {p.status !== "normal" && (
                    <Badge
                      className={`text-xs font-display font-semibold tracking-wide border ${
                        p.badgeColor ??
                        "bg-[hsl(var(--chart-3)/0.15)] text-[hsl(var(--chart-3))] border-[hsl(var(--chart-3)/0.3)]"
                      }`}
                    >
                      {p.status === "unknown" ? "Unknown" : "High Mem"}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}