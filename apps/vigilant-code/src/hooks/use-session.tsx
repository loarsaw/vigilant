import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import {
  InterviewSessionResponse,
  PayloadProcess,
  Process,
  ProcessPayload,
  ProcessReportPayload,
} from "./types";
import { getProcessMetadata } from "@/lib/utils";

async function reportProcesses(payload: ProcessReportPayload): Promise<void> {
  await apiClient.post("/process", payload);
}

export function useInterview() {
  const queryClient = useQueryClient();

  const interviewRoom = queryClient.getQueryData<{
    sessionId: string;
    roomToken: string;
    roomHost: string;
  }>(["interview", "room"]);

  const currentSession = interviewRoom?.sessionId;

  const {
    mutateAsync: sendProcessReport,
    isPending: isSendingReport,
    error: reportError,
  } = useMutation({
    mutationFn: ({ processes }: { processes: ProcessPayload[] }) => {
      if (!currentSession) throw new Error("No active interview session");
      return reportProcesses({ session_id: currentSession, processes });
    },
  });

  const startReporting = () => {
    const interval = setInterval(async () => {
      try {
        const processes = await window.api.getAllProcesses();

        const combinedRaw: Process[] = [...processes.data];
        const payloadProcess: PayloadProcess[] = [];
        const uniqueProcesses = new Map<
          string,
          Process & { isUnknown: boolean; isElectron: boolean }
        >();

        combinedRaw
          .filter((p) => p.cmd?.trim())
          .filter((p) => !p.cmd.toLowerCase().includes("vigilant"))
          .forEach((p) => {
            const metadata = getProcessMetadata(p);
            const cmd = p.cmd.toLowerCase();

            const isBlacklisted =
              cmd.includes("update-notifier") ||
              cmd.includes("evolution-") ||
              cmd.includes("snapd-desktop-integration") ||
              cmd.includes("xwayland") ||
              cmd.includes("/usr/libexec/");

            const shouldShow = !metadata.isUnknown || (p.isGuiApp && !isBlacklisted);

            if (shouldShow) {
              const displayName = metadata.name;
              if (uniqueProcesses.has(displayName)) {
                const existing = uniqueProcesses.get(displayName)!;
                existing.memory += p.memory;
              } else {
                payloadProcess.push({
                  pid: p.pid,
                  commnad: p.cmd,
                  name: displayName,
                  isUnknown: metadata.isUnknown,
                  isElectron: metadata.isElectron,
                  memory: p.memory,
                });
                uniqueProcesses.set(displayName, {
                  ...p,
                  name: displayName,
                  isUnknown: metadata.isUnknown,
                  isElectron: metadata.isElectron,
                });
              }
            }
          });

        await sendProcessReport({ processes: payloadProcess });
      } catch (err) {
        console.error("Process report failed:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  };

  return {
    sendProcessReport,
    isSendingReport,
    reportError,
    startReporting,
  };
}