import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { LiveKitConfigResponse, SaveLiveKitConfigPayload } from "./types";

const livekitApi = {
  getConfig: async (): Promise<LiveKitConfigResponse> => {
    const { data } = await apiClient.get<LiveKitConfigResponse>("/livekit-config");
    return data;
  },

  saveConfig: async (payload: SaveLiveKitConfigPayload): Promise<{ message: string }> => {
    const { data } = await apiClient.post<{ message: string }>("/livekit-config", payload);
    return data;
  },
};

export function useLiveKit() {
  const queryClient = useQueryClient();

  const {
    data: livekitConfig,
    isLoading: isLoadingLiveKit,
    isError: isLiveKitError,
  } = useQuery({
    queryKey: ["admin", "livekit-config"],
    queryFn: livekitApi.getConfig,
    retry: false,
  });

  const isLiveKitConfigured = !!livekitConfig && !isLiveKitError;

  const {
    mutate: saveLiveKitConfig,
    isPending: isSavingLiveKit,
    error: saveLiveKitErrorRaw,
    isSuccess: saveLiveKitSuccess,
    reset: resetSaveLiveKit,
  } = useMutation({
    mutationFn: (payload: SaveLiveKitConfigPayload) => livekitApi.saveConfig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "livekit-config"] });
    },
  });

  const saveLiveKitError = saveLiveKitErrorRaw
    ? ((saveLiveKitErrorRaw as any)?.response?.data?.error ?? "Failed to save LiveKit config")
    : null;

  return {
    livekitConfig,
    isLoadingLiveKit,
    isLiveKitConfigured,
    saveLiveKitConfig,
    isSavingLiveKit,
    saveLiveKitError,
    saveLiveKitSuccess,
    resetSaveLiveKit,
  };
}
