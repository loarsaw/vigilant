import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";

export interface Language {
  id: string;
  name: string;
  example: string;
}

interface LanguagesResponse {
  languages: Language[];
}

export interface Submission {
  id: string;
  language: string;
  code: string;
  stdout: string;
  stderr: string;
  exit_code: number;
  time_ms: number;
  memory_kb: number;
  status: "accepted" | "error" | "timeout";
  created_at: string;
}

export interface ExecuteRequest {
  language: string;
  code_b64: string;
}

async function fetchLanguages(): Promise<LanguagesResponse> {
  const response = await apiClient.get<LanguagesResponse>("/judge/languages");
  return response.data;
}

async function executeCode(payload: ExecuteRequest): Promise<Submission> {
  const response = await apiClient.post<Submission>("/judge/execute", payload);
  return response.data;
}

async function fetchSubmission(id: string): Promise<Submission> {
  const response = await apiClient.get<Submission>(`/judge/submissions/${id}`);
  return response.data;
}

async function fetchSubmissions(limit = 50): Promise<Submission[]> {
  const response = await apiClient.get<Submission[]>("/judge/submissions", {
    params: { limit },
  });
  return response.data;
}

export function useJudge() {
  const {
    data: languagesData,
    isLoading: isLoadingLanguages,
    isError: isLanguagesError,
    error: languagesError,
  } = useQuery<LanguagesResponse, Error>({
    queryKey: ["judge", "languages"],
    queryFn: fetchLanguages,
    staleTime: Infinity,
  });

  const {
    data: submissions,
    isLoading: isLoadingSubmissions,
    isError: isSubmissionsError,
    refetch: refetchSubmissions,
  } = useQuery<Submission[], Error>({
    queryKey: ["judge", "submissions"],
    queryFn: () => fetchSubmissions(),
    staleTime: 1000 * 30,
  });

  const useSubmission = (id: string | undefined) =>
    useQuery<Submission, Error>({
      queryKey: ["judge", "submissions", id],
      queryFn: () => fetchSubmission(id!),
      enabled: !!id,
      staleTime: Infinity,
    });

  const executeMutation = useMutation<Submission, Error, ExecuteRequest>({
    mutationFn: executeCode,
  });

  const execute = (language: string, code: string) => {
    const code_b64 = btoa(unescape(encodeURIComponent(code)));
    executeMutation.mutate({ language, code_b64 });
  };

  return {
    languages: languagesData?.languages ?? [],
    isLoadingLanguages,
    isLanguagesError,
    languagesError: languagesError?.message ?? null,

    execute,
    result: executeMutation.data ?? null,
    isExecuting: executeMutation.isPending,
    executeError: executeMutation.error?.message ?? null,
    isSuccess: executeMutation.isSuccess,
    reset: executeMutation.reset,

    submissions: submissions ?? [],
    isLoadingSubmissions,
    isSubmissionsError,
    refetchSubmissions,

    useSubmission,
  };
}
