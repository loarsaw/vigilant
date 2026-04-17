import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";

export interface Process {
  pid: number;
  name: string;
  cmd: string;
  memory: number;
  is_unknown: boolean;
  is_electron: boolean;
}

export interface ProcessReport {
  id: number;
  session_id: string;
  timestamp: string;
  processes: Process[];
  alert_count: number;
  high_memory_alerts: number;
  unknown_electron_alerts: number;
}

export type ProcessStatus = "normal" | "high_memory" | "unknown";

export interface EnrichedProcess extends Process {
  status: ProcessStatus;
  color: string; // tailwind text color class
  badgeColor: string; // tailwind badge bg class
}

export interface EnrichedProcessReport extends Omit<ProcessReport, "processes"> {
  processes: EnrichedProcess[];
  hasAlerts: boolean;
  hasUnknown: boolean;
}

const HIGH_MEMORY_THRESHOLD_MB = 500;

function getProcessStatus(p: Process): ProcessStatus {
  if (p.is_unknown) return "unknown";
  if (p.memory > HIGH_MEMORY_THRESHOLD_MB) return "high_memory";
  return "normal";
}

function getProcessColors(status: ProcessStatus): { color: string; badgeColor: string } {
  switch (status) {
    case "unknown":
      return { color: "text-red-400", badgeColor: "bg-red-500/20 text-red-400 border-red-500/30" };
    case "high_memory":
      return {
        color: "text-yellow-400",
        badgeColor: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      };
    default:
      return {
        color: "text-green-400",
        badgeColor: "bg-green-500/20 text-green-400 border-green-500/30",
      };
  }
}

function enrichReport(report: ProcessReport): EnrichedProcessReport {
  const processes: EnrichedProcess[] = report.processes.map((p) => {
    const status = getProcessStatus(p);
    const { color, badgeColor } = getProcessColors(status);
    return { ...p, status, color, badgeColor };
  });

  return {
    ...report,
    processes,
    hasAlerts:
      report.alert_count > 0 || report.high_memory_alerts > 0 || report.unknown_electron_alerts > 0,
    hasUnknown: processes.some((p) => p.status === "unknown"),
  };
}

const fetchProcessReports = async (sessionId: string): Promise<EnrichedProcessReport[]> => {
  const response = await apiClient.get<ProcessReport[]>(`/process/${sessionId}`);
  return response.data.map(enrichReport);
};

export function useProcessReports(sessionId: string | null | undefined) {
  const {
    data: reports,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery<EnrichedProcessReport[], Error>({
    queryKey: ["admin", "process-reports", sessionId],
    queryFn: () => fetchProcessReports(sessionId!),
    enabled: !!sessionId,
    staleTime: 1000 * 60 * 2,
    refetchInterval: 5000, // poll every 5s for live telemetry
  });

  const latest = reports?.[0] ?? null;

  return {
    reports: reports ?? [],
    latest, // most recent snapshot
    hasAnyAlerts: latest?.hasAlerts ?? false,
    hasUnknownProcesses: latest?.hasUnknown ?? false,
    isLoading,
    isFetching,
    isError,
    errorMessage: error?.message ?? null,
    refetch,
  };
}
