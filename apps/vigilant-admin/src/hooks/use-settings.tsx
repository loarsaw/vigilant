import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";

export interface SESConfigPayload {
  aws_region: string;
  aws_access_key_id: string;
  aws_secret_access_key: string;
  ses_from_email: string;
  ses_login_url: string;
}

export interface SESConfigResponse {
  aws_region: string;
  aws_access_key_id: string;
  ses_from_email: string;
  ses_login_url: string;
}

export interface GoogleCredentialPayload {
  credential_name: string;
  organization_id?: string;
  user_id?: string;
  credentials_json: string;
  is_default: boolean;
  delegated_admin_email?: string;
  subject_email?: string;
  scopes?: string[];
}

export interface GoogleCredentialResponse {
  id: number;
  credential_name: string;
  client_email: string;
  project_id: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}
async function fetchEmailConfig(): Promise<SESConfigResponse> {
  const response = await apiClient.get<SESConfigResponse>("/email-config");
  return response.data;
}

async function saveEmailConfig(payload: SESConfigPayload): Promise<void> {
  await apiClient.post("/email-config", payload);
}

async function saveGoogleCredential(
  payload: GoogleCredentialPayload,
): Promise<GoogleCredentialResponse> {
  const response = await apiClient.post<GoogleCredentialResponse>("/credentials/google", payload);
  return response.data;
}

export function useSettings() {
  const queryClient = useQueryClient();

  const {
    data: emailConfig,
    isLoading: isLoadingEmail,
    isError: isEmailError,
    error: emailFetchError,
  } = useQuery<SESConfigResponse, Error>({
    queryKey: ["settings", "email-config"],
    queryFn: fetchEmailConfig,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const saveEmailMutation = useMutation<void, Error, SESConfigPayload>({
    mutationFn: saveEmailConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "email-config"] });
    },
  });

  const saveGoogleCredentialMutation = useMutation<
    GoogleCredentialResponse,
    Error,
    GoogleCredentialPayload
  >({
    mutationFn: saveGoogleCredential,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["settings", "google-credential"],
      });
    },
  });

  return {
    emailConfig,
    isEmailConfigured: !!emailConfig,
    isLoadingEmail,
    isEmailError,
    emailFetchError: emailFetchError?.message ?? null,

    saveEmailConfig: saveEmailMutation.mutate,
    saveEmailConfigAsync: saveEmailMutation.mutateAsync,
    isSavingEmail: saveEmailMutation.isPending,
    saveEmailError: saveEmailMutation.error?.message ?? null,
    saveEmailSuccess: saveEmailMutation.isSuccess,

    saveGoogleCredential: saveGoogleCredentialMutation.mutate,
    saveGoogleCredentialAsync: saveGoogleCredentialMutation.mutateAsync,
    isSavingGoogle: saveGoogleCredentialMutation.isPending,
    saveGoogleError: saveGoogleCredentialMutation.error?.message ?? null,
    saveGoogleSuccess: saveGoogleCredentialMutation.isSuccess,
    savedGoogleCredential: saveGoogleCredentialMutation.data ?? null,
  };
}
