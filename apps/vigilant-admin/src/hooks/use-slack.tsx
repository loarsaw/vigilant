// src/hooks/use-slack.tsx
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { SaveSlackConfigPayload, SlackConfigResponse, TestSlackPayload } from "./types";

const slackApi = {
  getConfig: async (): Promise<SlackConfigResponse> => {
    const { data } = await apiClient.get<SlackConfigResponse>("/slack-config");
    return data;
  },

  saveConfig: async (payload: SaveSlackConfigPayload): Promise<SlackConfigResponse> => {
    const { data } = await apiClient.put<SlackConfigResponse>("/slack-config", payload);
    return data;
  },

  disconnect: async (): Promise<{ message: string }> => {
    const { data } = await apiClient.delete<{ message: string }>("/slack-config");
    return data;
  },

  test: async (payload: TestSlackPayload): Promise<{ message: string }> => {
    const { data } = await apiClient.post<{ message: string }>("/slack-config/test", payload);
    return data;
  },
};

// The server returns { error, details? }. For Slack delivery failures `details`
// is the actionable part ("webhook was revoked…"), so prefer it.
function extractError(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { error?: string; details?: string } } })?.response
    ?.data;
  return data?.details ?? data?.error ?? fallback;
}

/**
 * @param enabled set false for roles that can't manage Slack (interviewers) so
 * we don't fire a request that is guaranteed to 403.
 */
export function useSlack(enabled = true) {
  const queryClient = useQueryClient();
  const queryKey = ["admin", "slack-config"];

  const { data: slackConfig, isLoading: isLoadingSlack } = useQuery({
    queryKey,
    queryFn: slackApi.getConfig,
    retry: false,
    enabled,
  });

  const isSlackConfigured = !!slackConfig?.configured;

  const {
    mutate: saveSlackConfig,
    isPending: isSavingSlack,
    error: saveSlackErrorRaw,
    isSuccess: saveSlackSuccess,
    reset: resetSaveSlack,
  } = useMutation({
    mutationFn: (payload: SaveSlackConfigPayload) => slackApi.saveConfig(payload),
    onSuccess: (data) => {
      // The PUT returns the fresh settings, so no refetch round trip is needed.
      queryClient.setQueryData(queryKey, data);
    },
  });

  const {
    mutate: disconnectSlack,
    isPending: isDisconnectingSlack,
    error: disconnectErrorRaw,
  } = useMutation({
    mutationFn: slackApi.disconnect,
    onSuccess: () => queryClient.setQueryData(queryKey, { configured: false }),
  });

  const {
    mutate: testSlack,
    isPending: isTestingSlack,
    error: testErrorRaw,
    isSuccess: testSlackSuccess,
    variables: testVariables,
    reset: resetTestSlack,
  } = useMutation({
    mutationFn: (payload: TestSlackPayload) => slackApi.test(payload),
    // A test refreshes delivery health (last success / last error).
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    slackConfig,
    isLoadingSlack,
    isSlackConfigured,

    saveSlackConfig,
    isSavingSlack,
    saveSlackError: saveSlackErrorRaw
      ? extractError(saveSlackErrorRaw, "Failed to save Slack config")
      : null,
    saveSlackSuccess,
    resetSaveSlack,

    disconnectSlack,
    isDisconnectingSlack,
    disconnectSlackError: disconnectErrorRaw
      ? extractError(disconnectErrorRaw, "Failed to disconnect Slack")
      : null,

    testSlack,
    isTestingSlack,
    testSlackError: testErrorRaw ? extractError(testErrorRaw, "Failed to send test message") : null,
    testSlackSuccess,
    testSlackKind: testVariables?.kind ?? "ping",
    resetTestSlack,
  };
}
