import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { SaveTwilioConfigPayload, TwilioConfigResponse } from "./types";



const twilioApi = {
  getConfig: async (): Promise<TwilioConfigResponse> => {
    const { data } = await apiClient.get<TwilioConfigResponse>("/admin/twilio-config");
    return data;
  },

  saveConfig: async (payload: SaveTwilioConfigPayload): Promise<{ message: string }> => {
    const { data } = await apiClient.post<{ message: string }>("/admin/twilio-config", payload);
    return data;
  },
};

export function useTwilio() {
  const queryClient = useQueryClient();

  const {
    data: twilioConfig,
    isLoading: isLoadingTwilio,
    isError: isTwilioError,
  } = useQuery({
    queryKey: ["admin", "twilio-config"],
    queryFn: twilioApi.getConfig,
    retry: false,
  });

  const isTwilioConfigured = !!twilioConfig && !isTwilioError;

  const {
    mutate: saveTwilioConfig,
    isPending: isSavingTwilio,
    error: saveTwilioErrorRaw,
    isSuccess: saveTwilioSuccess,
    reset: resetSaveTwilio,
  } = useMutation({
    mutationFn: (payload: SaveTwilioConfigPayload) => twilioApi.saveConfig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "twilio-config"] });
    },
  });

  const saveTwilioError = saveTwilioErrorRaw
    ? (saveTwilioErrorRaw as any)?.response?.data?.error ?? "Failed to save Twilio config"
    : null;

  return {
    twilioConfig,
    isLoadingTwilio,
    isTwilioConfigured,
    saveTwilioConfig,
    isSavingTwilio,
    saveTwilioError,
    saveTwilioSuccess,
    resetSaveTwilio,
  };
}