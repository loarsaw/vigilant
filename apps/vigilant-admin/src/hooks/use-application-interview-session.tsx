import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { ApplicationInterviewFeedbackResponse } from "./types";

const fetchApplicationInterviewFeedback = async (
  applicationId: string,
): Promise<ApplicationInterviewFeedbackResponse> => {
  const response = await apiClient.get(`/applications/${applicationId}/interviews/feedback`);
  return response.data;
};

export function useApplicationInterviewFeedback(applicationId?: string) {
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["application-interview-feedback", applicationId],
    queryFn: () => fetchApplicationInterviewFeedback(applicationId!),
    enabled: !!applicationId,
    staleTime: 1000 * 60 * 2,
  });

  return {
    sessions: data?.data ?? [],
    total: data?.total ?? 0,
    applicationId: data?.application_id ?? null,

    // Derived helpers
    completedSessions: data?.data.filter((s) => s.status === "completed") ?? [],
    sessionsWithFeedback: data?.data.filter((s) => s.feedback !== null) ?? [],
    pendingFeedback:
      data?.data.filter((s) => s.status === "completed" && s.feedback === null) ?? [],

    isLoading,
    isFetching,
    isError,
    errorMessage: error?.message ?? null,
    refetch,
  };
}
