// src/hooks/use-github.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { GithubConfigResponse, SaveGithubCredentialsPayload } from "./types";

const githubApi = {
  getConfig: async (): Promise<GithubConfigResponse> => {
    const { data } = await apiClient.get<GithubConfigResponse>("/github-config");
    return data;
  },

  saveConfig: async (payload: SaveGithubCredentialsPayload): Promise<{ message: string }> => {
    const { data } = await apiClient.post<{ message: string }>("/github-config", payload);
    return data;
  },
};

export function useGithub() {
  const queryClient = useQueryClient();

  const {
    data: githubConfig,
    isLoading: isLoadingGithub,
  } = useQuery({
    queryKey: ["admin", "github-config"],
    queryFn: githubApi.getConfig,
    retry: false,
  });

  const isGithubConfigured = !!githubConfig?.configured;

  const {
    mutate: saveGithubConfig,
    isPending: isSavingGithub,
    error: saveGithubErrorRaw,
    isSuccess: saveGithubSuccess,
    reset: resetSaveGithub,
  } = useMutation({
    mutationFn: (payload: SaveGithubCredentialsPayload) => githubApi.saveConfig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "github-config"] });
    },
  });

  const saveGithubError = saveGithubErrorRaw
    ? ((saveGithubErrorRaw as any)?.response?.data?.error ?? "Failed to save GitHub config")
    : null;

  return {
    githubConfig,
    isLoadingGithub,
    isGithubConfigured,
    saveGithubConfig,
    isSavingGithub,
    saveGithubError,
    saveGithubSuccess,
    resetSaveGithub,
  };
}