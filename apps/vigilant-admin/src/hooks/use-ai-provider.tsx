// use-ai-provider.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { SaveAIProviderConfigPayload } from "@/hooks/types";

type ProviderKey = "openai" | "gemini" | "claude";

interface ProviderRecord {
  provider: ProviderKey;
  base_url: string | null;
  model: string;
  has_key: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProvidersConfigResponse {
  providers: ProviderRecord[];
}

const aiProviderApi = {
  getAllConfigs: async (): Promise<ProvidersConfigResponse> => {
    const { data } = await apiClient.get<ProvidersConfigResponse>(
      `/ai/providers-config`,
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
    queryKey: ["ai", "providers-config"],
    queryFn: aiProviderApi.getAllConfigs,
    retry: false,
    select: (data) => data.providers.find((p) => p.provider === provider) ?? null,
  });

  // Configured means: the record exists AND actually has a stored key.
  const isProviderConfigured = !isProviderError && !!providerConfig?.has_key;

  const {
    mutate: saveProviderConfig,
    isPending: isSavingProvider,
    error: saveProviderErrorRaw,
    isSuccess: saveProviderSuccess,
    reset: resetSaveProvider,
  } = useMutation({
    mutationFn: (payload: SaveAIProviderConfigPayload) => aiProviderApi.saveConfig(payload),
    onSuccess: () => {
      // Invalidate the shared list, not a per-provider key that no longer exists.
      queryClient.invalidateQueries({ queryKey: ["ai", "providers-config"] });
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