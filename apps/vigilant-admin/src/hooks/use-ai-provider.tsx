import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { AIProviderConfigResponse, SaveAIProviderConfigPayload } from "@/hooks/types";

type ProviderKey = "openai" | "gemini" | "claude";

const aiProviderApi = {
  getConfig: async (provider: ProviderKey): Promise<AIProviderConfigResponse> => {
    const { data } = await apiClient.get<AIProviderConfigResponse>(
      `/ai/provider-config/${provider}`,
    );
    return data;
  },

  saveConfig: async (payload: SaveAIProviderConfigPayload): Promise<{ message: string }> => {
    const { data } = await apiClient.post<{ message: string }>("/ai/provider-config", payload);
    return data;
  },
};

export function useAIProvider(provider: ProviderKey) {
  const queryClient = useQueryClient();

  const {
    data: providerConfig,
    isLoading: isLoadingProvider,
    isError: isProviderError,
  } = useQuery({
    queryKey: ["ai", "provider-config", provider],
    queryFn: () => aiProviderApi.getConfig(provider),
    retry: false,
  });

  const isProviderConfigured = !!providerConfig && !isProviderError;

  const {
    mutate: saveProviderConfig,
    isPending: isSavingProvider,
    error: saveProviderErrorRaw,
    isSuccess: saveProviderSuccess,
    reset: resetSaveProvider,
  } = useMutation({
    mutationFn: (payload: SaveAIProviderConfigPayload) => aiProviderApi.saveConfig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai", "provider-config", provider] });
    },
  });

  const saveProviderError = saveProviderErrorRaw
    ? ((saveProviderErrorRaw as any)?.response?.data?.error ?? "Failed to save provider config")
    : null;

  return {
    providerConfig,
    isLoadingProvider,
    isProviderConfigured,
    saveProviderConfig,
    isSavingProvider,
    saveProviderError,
    saveProviderSuccess,
    resetSaveProvider,
  };
}
