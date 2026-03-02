import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';

interface CreateInterviewResponse {
  id: number;
  session_id: string;
  candidate_id: string;
  candidate_session_id: string;
  status: string;
  created_at: string;
}

interface AuthUser {
  candidate_id: number;
  email: string;
  full_name: string;
  session_id: string;
}

interface ProcessPayload {
  category: string;
  cmd: string;
  confidence: number;
  cpu: number;
  cwd: string;
  isGuiApp: boolean;
  isUserApp: boolean;
  memory: number;
  name: string;
  path: string;
  pid: number;
  ppid: number;
  processType: string;
  startTime: string;
  uid: number;
  username: string;
}

interface ProcessReportPayload {
  session_id: string;
  processes: ProcessPayload[];
}

async function createInterview(candidateSessionId: string): Promise<CreateInterviewResponse> {
  const { data } = await apiClient.post<CreateInterviewResponse>('/create-interview', {
    candidate_session_id: candidateSessionId,
  });
  return data;
}

async function reportProcesses(payload: ProcessReportPayload): Promise<void> {
  await apiClient.post('/process', payload);
}

export function useInterview() {
  const queryClient = useQueryClient();

  const user = queryClient.getQueryData<AuthUser>(['auth', 'me']);

  const {
    mutateAsync: startInterview,
    isPending: isStarting,
    error: startError,
    data: interviewSession,
    reset,
  } = useMutation({
    mutationFn: () => {
      if (!user?.session_id) throw new Error('No active session');
      return createInterview(user.session_id);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['interview', 'session'], data);
    },
  });

  const currentSession = queryClient.getQueryData<CreateInterviewResponse>(['interview', 'session']);
  const interviewSessionId = currentSession?.session_id ?? interviewSession?.session_id ?? null;

const {
    mutateAsync: sendProcessReport,
    isPending: isSendingReport,
    error: reportError,
  } = useMutation({
    mutationFn: (processes: ProcessPayload[]) => {
      if (!interviewSessionId) throw new Error('No active interview session');
      return reportProcesses({ session_id: interviewSessionId, processes });
    },
  });

  const startReporting = (getProcesses: () => ProcessPayload[]) => {
    const interval = setInterval(async () => {
      try {
        const processes = getProcesses();
        if (processes.length > 0) {
          await sendProcessReport(processes);
        }
      } catch (err) {
        console.error('Process report failed:', err);
      }
    }, 5000);

    return () => clearInterval(interval); 
  };

  return {
    startInterview,
    isStarting,
    startError,
    interviewSession: interviewSession ?? currentSession ?? null,
    interviewSessionId,
    reset,

    sendProcessReport,
    isSendingReport,
    reportError,
    startReporting,  
  };
}