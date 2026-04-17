import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { useState } from "react";
import {
  CreateInterviewFeedbackPayload,
  CreateInterviewPayload,
  InterviewersResponse,
  InterviewFeedback,
  InterviewSessionsParams,
  InterviewSessionsResponse,
  InterviewSessionStatusResponse,
  StartEndInterviewResponse,
} from "./types";

const fetchInterviewSessions = async (
  params: InterviewSessionsParams,
): Promise<InterviewSessionsResponse> => {
  const response = await apiClient.get("/interviews", { params });
  return response.data;
};

const fetchInterviewers = async (): Promise<InterviewersResponse> => {
  const response = await apiClient.get("/interviewers");
  return response.data;
};

const createInterview = async (payload: CreateInterviewPayload) => {
  const response = await apiClient.post("/create-interview", payload);
  return response.data;
};

const createInterviewFeedback = async (
  payload: CreateInterviewFeedbackPayload,
): Promise<InterviewFeedback> => {
  const response = await apiClient.post("/interview-session/feeback", payload);
  return response.data;
};

const startInterviewSession = async (sessionId: string): Promise<StartEndInterviewResponse> => {
  const response = await apiClient.patch(`/interview-session/${sessionId}/start`);
  return response.data;
};

const endInterviewSession = async (sessionId: string): Promise<StartEndInterviewResponse> => {
  const response = await apiClient.patch(`/interview-session/${sessionId}/end`);
  return response.data;
};

// New fetch function for session status
const fetchInterviewSessionStatus = async (
  sessionId: string,
): Promise<InterviewSessionStatusResponse> => {
  const response = await apiClient.get(`/interview-sessions/${sessionId}/status`);
  return response.data;
};

export function useInterview(candidateId?: string, sessionIdForStatus?: string) {
  const queryClient = useQueryClient();

  const [sessionParams, setSessionParams] = useState<InterviewSessionsParams>({
    page: 1,
    limit: 20,
    filter: "all",
    ...(candidateId ? { candidate_id: candidateId } : {}),
  });

  const {
    data: sessionData,
    isLoading: isLoadingSessions,
    isFetching: isFetchingSessions,
  } = useQuery({
    queryKey: ["interview-sessions", sessionParams],
    queryFn: () => fetchInterviewSessions(sessionParams),
    staleTime: 1000 * 60 * 2,
  });

  const { data: interviewersData, isLoading: isLoadingInterviewers } = useQuery({
    queryKey: ["interviewers"],
    queryFn: fetchInterviewers,
    staleTime: 1000 * 60 * 10,
  });

  // New query for session status
  const {
    data: sessionStatusData,
    isLoading: isLoadingSessionStatus,
    isFetching: isFetchingSessionStatus,
    isError: isSessionStatusError,
    error: sessionStatusError,
    refetch: refetchSessionStatus,
  } = useQuery({
    queryKey: ["interview-session-status", sessionIdForStatus],
    queryFn: () => fetchInterviewSessionStatus(sessionIdForStatus!),
    enabled: !!sessionIdForStatus,
  });

  const scheduleMutation = useMutation({
    mutationFn: createInterview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview-sessions"] });
      if (candidateId) {
        queryClient.invalidateQueries({ queryKey: ["candidate-applications", candidateId] });
      }
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: createInterviewFeedback,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["interview-feedback", variables.interview_session_id],
      });
      queryClient.invalidateQueries({ queryKey: ["interview-sessions"] });
    },
  });

  const startSessionMutation = useMutation({
    mutationFn: startInterviewSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["interview-session-status", sessionIdForStatus] });
      if (candidateId) {
        queryClient.invalidateQueries({ queryKey: ["candidate-applications", candidateId] });
      }
    },
  });

  const endSessionMutation = useMutation({
    mutationFn: endInterviewSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["interview-session-status", sessionIdForStatus] });
      if (candidateId) {
        queryClient.invalidateQueries({ queryKey: ["candidate-applications", candidateId] });
      }
    },
  });

  return {
    sessions: sessionData?.data ?? [],
    totalSessions: sessionData?.total ?? 0,
    sessionPagination: {
      page: sessionData?.page ?? 1,
      limit: sessionData?.limit ?? 20,
      totalPages: sessionData?.total_pages ?? 1,
    },
    sessionParams,
    setSessionParams,

    setSessionPage: (page: number) => setSessionParams((prev) => ({ ...prev, page })),
    setSessionFilter: (filter: InterviewSessionsParams["filter"]) =>
      setSessionParams((prev) => ({ ...prev, filter, page: 1 })),
    setSessionStatus: (status: string) =>
      setSessionParams((prev) => ({ ...prev, status, page: 1 })),

    isLoading: isLoadingSessions,
    isFetchingSessions,
    isScheduling: scheduleMutation.isPending,
    isSubmittingFeedback: feedbackMutation.isPending,
    isStartingSession: startSessionMutation.isPending,
    isEndingSession: endSessionMutation.isPending,

    scheduleInterview: scheduleMutation.mutate,
    scheduleInterviewAsync: scheduleMutation.mutateAsync,

    submitFeedback: feedbackMutation.mutate,
    submitFeedbackAsync: feedbackMutation.mutateAsync,

    startSession: startSessionMutation.mutate,
    startSessionAsync: startSessionMutation.mutateAsync,

    endSession: endSessionMutation.mutate,
    endSessionAsync: endSessionMutation.mutateAsync,

    interviewers: interviewersData?.interviewers ?? [],
    isLoadingInterviewers,

    scheduleError: scheduleMutation.error?.message ?? null,
    feedbackError: feedbackMutation.error?.message ?? null,
    startSessionError: startSessionMutation.error?.message ?? null,
    endSessionError: endSessionMutation.error?.message ?? null,

    // session status fields
    sessionStatus: sessionStatusData?.status ?? null,
    isLoadingSessionStatus,
    isFetchingSessionStatus,
    isSessionStatusError,
    sessionStatusErrorMessage: sessionStatusError?.message ?? null,
    refetchSessionStatus,
  };
}
