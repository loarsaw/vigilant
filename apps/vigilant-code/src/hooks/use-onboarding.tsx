import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { OnboardingPayload } from "./types";

const onboardingApi = {
  complete: async (payload: OnboardingPayload): Promise<void> => {
    await apiClient.post("/onboarding", payload);
  },
};

export function useOnboarding() {
  const queryClient = useQueryClient();

  const {
    mutateAsync: completeOnboarding,
    isPending: isSubmitting,
    error: submitError,
    reset: resetOnboarding,
  } = useMutation({
    mutationFn: (payload: OnboardingPayload) => onboardingApi.complete(payload),
    onSuccess: () => {
      queryClient.setQueryData<Record<string, unknown>>(["auth", "me"], (prev) => {
        if (!prev) return prev;
        return { ...prev, onboarding_complete: true };
      });
    },
  });

  return {
    completeOnboarding,
    isSubmitting,
    submitError,
    resetOnboarding,
  };
}
