import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { InterviewSessionResponse } from "./types";

const fetchInterviewSession = async (interviewId: string): Promise<InterviewSessionResponse> => {
  const response = await apiClient.get<InterviewSessionResponse>(
    `/interviews/${interviewId}/session`,
  );
  return response.data;
};

export function useInterviewSession(interviewId: string | undefined) {
  const { data, isLoading, isError, error, refetch } = useQuery<InterviewSessionResponse, Error>({
    queryKey: ["interview", "session"],
    queryFn: () => fetchInterviewSession(interviewId!),
    enabled: !!interviewId,
    staleTime: 1000 * 60 * 5,
  });

  return {
    interviewId: data?.interview_id ?? null,
    sessionId: data?.session_id ?? null,
    isLoading,
    isError,
    errorMessage: error?.message ?? null,
    refetch,
  };
}
