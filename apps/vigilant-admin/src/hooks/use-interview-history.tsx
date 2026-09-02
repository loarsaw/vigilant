import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { InterviewSessionDetailsResponse } from "./types";

const fetchInterviewSessionDetails = async (
  sessionID: string,
): Promise<InterviewSessionDetailsResponse> => {
  const response = await apiClient.get(`/interview-sessions/${sessionID}/details`);
  return response.data;
};

export function useInterviewSessionDetails(sessionID: string | null | undefined) {
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery<
    InterviewSessionDetailsResponse,
    Error
  >({
    queryKey: ["interview-session-details", sessionID],
    queryFn: () => fetchInterviewSessionDetails(sessionID!),
    enabled: !!sessionID,
  });

  const session = data?.data ?? null;
  const feedback = session?.feedback ?? null;

  const hasFeedback = feedback !== null;
  const isCompleted = session?.status === "completed";
  const isInProgress = session?.status === "in_progress";
  const isScheduled = session?.status === "scheduled";

  const durationInMinutes = session?.scheduled_duration ?? null;
  const actualDuration =
    session?.started_at && session?.ended_at
      ? Math.round(
          (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) /
            1000 /
            60,
        )
      : null;

  return {
    // session data
    session,
    sessionID: session?.id ?? null,
    candidateID: session?.candidate_id ?? null,
    applicationID: session?.application_id ?? null,
    interviewerID: session?.interviewer_id ?? null,
    position: session?.position ?? null,
    interviewType: session?.interview_type ?? null,
    interviewURL: session?.interview_url ?? null,
    scheduledAt: session?.scheduled_at ?? null,
    startedAt: session?.started_at ?? null,
    endedAt: session?.ended_at ?? null,
    status: session?.status ?? null,
    metadata: session?.metadata ?? null,

    // feedback data
    feedback,
    hasFeedback,
    technicalSkillsScore: feedback?.technical_skills_score ?? null,
    communicationScore: feedback?.communication_score ?? null,
    problemSolvingScore: feedback?.problem_solving_score ?? null,
    culturalFitScore: feedback?.cultural_fit_score ?? null,
    overallScore: feedback?.overall_score ?? null,
    comments: feedback?.comments ?? null,
    recommendation: feedback?.recommendation ?? null,

    // derived/computed
    isCompleted,
    isInProgress,
    isScheduled,
    durationInMinutes,
    actualDuration,

    // query state
    isLoading,
    isFetching,
    isError,
    errorMessage: error?.message ?? null,
    refetch,
  };
}
