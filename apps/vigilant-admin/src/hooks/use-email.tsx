import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { SendCustomEmailPayload } from "./types";


const sendCustomEmail = async (payload: SendCustomEmailPayload) => {
  const response = await apiClient.post("/emails/send", payload);
  return response.data;
};

export function useEmail() {
  const emailMutation = useMutation({
    mutationFn: sendCustomEmail,
  });

  return {
    sendEmail: emailMutation.mutate,
    sendEmailAsync: emailMutation.mutateAsync,
    isSendingEmail: emailMutation.isPending,
    emailError: emailMutation.error?.message ?? null,
  };
}