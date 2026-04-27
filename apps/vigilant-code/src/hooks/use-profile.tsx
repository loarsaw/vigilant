import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { CandidateProfile, UpdateProfilePayload } from "./types";

async function fetchMe(): Promise<CandidateProfile> {
  const response = await apiClient.get<CandidateProfile>("/auth/me");
  return response.data;
}

async function updateMe(payload: UpdateProfilePayload): Promise<void> {
  await apiClient.patch("/update-me", payload);
}

export function useProfile() {
  const queryClient = useQueryClient();

  const {
    data: profile,
    isLoading,
    isError,
    error,
  } = useQuery<CandidateProfile, Error>({
    queryKey: ["profile"],
    queryFn: fetchMe,
    staleTime: 1000 * 60 * 5,
  });

  const updateMutation = useMutation<void, Error, UpdateProfilePayload>({
    mutationFn: updateMe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  return {
    profile: profile ?? null,
    isLoading,
    isError,
    error: error?.message ?? null,

    updateProfile: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error?.message ?? null,
    isUpdateSuccess: updateMutation.isSuccess,
    resetUpdate: updateMutation.reset,
  };
}
