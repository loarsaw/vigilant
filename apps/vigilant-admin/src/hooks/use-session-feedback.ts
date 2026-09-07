// apps/vigilant-admin/src/hooks/use-session-feedback.ts
import type { InterviewFeedbackDetail, InterviewFeedbackListResponse } from "@/hooks/types";
import { apiClient } from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";

export function useSessionFeedback(applicationId: string | undefined, sessionId: string | undefined) {
    const query = useQuery({
        queryKey: ["application-interview-feedback", applicationId],
        queryFn: async () => {
            const { data } = await apiClient.get<InterviewFeedbackListResponse>(
                `/applications/${applicationId}/interviews/feedback`,
            );
            return data;
        },
        enabled: Boolean(applicationId),
    });

    const matchedSession = query.data?.data.find((s) => s.session_id === sessionId);
    const feedback = (matchedSession?.feedback ?? null) as InterviewFeedbackDetail | null;

    return {
        feedback,
        isLoadingFeedback: query.isLoading,
        feedbackFetchError: query.isError,
        refetchFeedback: query.refetch,
    };
}