import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { LanguagesResponse } from "./types";

async function fetchLanguages(): Promise<LanguagesResponse> {
  const response = await apiClient.get<LanguagesResponse>("/judge/languages");
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

  return {
    languages: languagesData?.languages ?? [],
    isLoadingLanguages,
    isLanguagesError,
    languagesError: languagesError?.message ?? null,
  };
}
