import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { ApplicationTimelineResponse } from "./types";

export const APPLICATION_TIMELINE_KEY = "application-timeline";

export function useApplicationTimeline(applicationId?: string) {
  return useQuery<ApplicationTimelineResponse, Error>({
    queryKey: [APPLICATION_TIMELINE_KEY, applicationId],
    queryFn: async () => {
      const res = await apiClient.get<ApplicationTimelineResponse>(
        `/applications/${applicationId}/timeline`,
      );
      return res.data;
    },
    enabled: !!applicationId,
    staleTime: 30_000,
  });
}
