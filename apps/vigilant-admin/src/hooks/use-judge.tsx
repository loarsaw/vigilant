import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';

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
  status: 'accepted' | 'error' | 'timeout';
  created_at: string;
}

export interface ExecuteRequest {
  language: string;
  code_b64: string; 
}



async function fetchLanguages(): Promise<LanguagesResponse> {
  const response = await apiClient.get<LanguagesResponse>('/judge/languages');
  return response.data;
}




export function useJudge() {
  
  const {
    data: languagesData,
    isLoading: isLoadingLanguages,
    isError: isLanguagesError,
    error: languagesError,
  } = useQuery<LanguagesResponse, Error>({
    queryKey: ['judge', 'languages'],
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