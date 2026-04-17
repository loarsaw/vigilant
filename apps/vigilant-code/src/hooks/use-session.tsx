import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import {
  CreateInterviewResponse,
  ProcessPayload,
  ProcessReportPayload,
  SessionAuthUser,
} from "./types";
import { getProcessMetadata } from "@/lib/utils";

export interface Process {
  pid: number;
  name: string;
  cmd: string;
  memory: number;
  category: string;
  confidence?: number;
  username: string;
  isGuiApp?: boolean;
  path?: string;
}

export interface PayloadProcess {
  pid: number;
  name: string;
  isElectron: boolean;
  isUnknown: boolean;
  memory: number;
  commnad: string;
}

async function createInterview(candidateSessionId: string): Promise<CreateInterviewResponse> {
  const { data } = await apiClient.post<CreateInterviewResponse>("/create-interview", {
    candidate_session_id: candidateSessionId,
  });
  return data;
}

async function reportProcesses(payload: ProcessReportPayload): Promise<void> {
  await apiClient.post("/process", payload);
}

export function useInterview() {
  const queryClient = useQueryClient();

  const user = queryClient.getQueryData<SessionAuthUser>(["auth", "me"]);

  const {
    mutateAsync: startInterview,
    isPending: isStarting,
    error: startError,
    data: interviewSession,
    reset,
  } = useMutation({
    mutationFn: () => {
      if (!user?.session_id) throw new Error("No active session");
      return createInterview(user.session_id);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["interview", "session"], data);
    },
  });

  const currentSession = queryClient.getQueryData<CreateInterviewResponse>([
    "interview",
    "session",
  ]);
  console.log(currentSession, "current Se");

  const {
    mutateAsync: sendProcessReport,
    isPending: isSendingReport,
    error: reportError,
  } = useMutation({
    mutationFn: ({ processes }: { processes: ProcessPayload[] }) => {
      if (!currentSession.session_id) throw new Error("No active interview session");
      return reportProcesses({ session_id: currentSession.session_id, processes });
    },
  });

  const startReporting = () => {
    const interval = setInterval(async () => {
      try {
        const processes = await window.api.getAllProcesses();
        console.log(processes, "process");

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
        // console.log(uniqueProcesses, "uNi");
      } catch (err) {
        console.error("Process report failed:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  };

  return {
    startInterview,
    isStarting,
    startError,
    interviewSession: interviewSession ?? currentSession ?? null,
    reset,

    sendProcessReport,
    isSendingReport,
    reportError,
    startReporting,
  };
}
