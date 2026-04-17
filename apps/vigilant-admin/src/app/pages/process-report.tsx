import { AlertTriangle, CheckCircle, Terminal } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProcessReports } from "@/hooks/use-process-report";

export function SystemDiagnostics({ sessionId }: { sessionId: string | null }) {
  const { reports, latest, hasAnyAlerts, hasUnknownProcesses, isLoading } =
    useProcessReports(sessionId);

  const connected = reports.length > 0;

  return (
    <Card className="bg-[#1a1f2e] border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Terminal className="h-5 w-5 text-cyan-400" />
          System Diagnostics
          {connected && (
            <span className="ml-auto flex items-center gap-1.5">
              {hasUnknownProcesses ? (
                <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Unknown Process Detected
                </Badge>
              ) : hasAnyAlerts ? (
                <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Alerts Active
                </Badge>
              ) : (
                <Badge className="bg-green-500/20 text-green-400 border border-green-500/30">
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
          <div className="flex items-center justify-center p-8 border-2 border-dashed border-border rounded-lg">
            <p className="text-muted-foreground italic text-sm text-center">
              Waiting for candidate to connect to session...
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
                className={`flex items-center justify-between rounded-md px-3 py-2 text-sm
                  ${p.status === "unknown" ? "bg-red-500/10 border border-red-500/20" : "bg-white/5"}`}
              >
                <div className="flex items-center gap-2">
                  {p.status === "unknown" && (
                    <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                  )}
                  <span className={`font-medium ${p.color}`}>{p.name}</span>
                  <span className="text-muted-foreground text-xs">PID {p.pid}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">{p.memory.toFixed(1)} MB</span>
                  {p.status !== "normal" && (
                    <Badge className={`text-xs border ${p.badgeColor}`}>
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
