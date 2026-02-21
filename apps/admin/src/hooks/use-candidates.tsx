import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';


export interface Candidate {
  id: number;
  email: string;
  full_name: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  interview_current_stage: string;
  interview_next_stage: string;
  current_stage_qualified: boolean;
  interview_completed: boolean;
}

export interface UpdateCandidatePayload {
  full_name?: string;
  is_active?: boolean;
  password?: string;
  interview_current_stage?: string;
  interview_next_stage?: string;
  current_stage_qualified?: boolean;
  interview_completed?: boolean;
}

interface UpdateCandidateVariables {
  id: number;
  payload: UpdateCandidatePayload;
}


async function fetchCandidates(): Promise<Candidate[]> {
  const response = await apiClient.get<Candidate[]>('/candidates');
  return response.data;
}


async function fetchCandidate(id: string): Promise<Candidate> {
  const response = await apiClient.get<Candidate>(`/candidates/${id}`);
  return response.data;
}
async function updateCandidate({ id, payload }: UpdateCandidateVariables): Promise<void> {
  await apiClient.patch(`/candidates/${id}`, payload);
}



export function useCandidates() {
  const queryClient = useQueryClient();

  

  const { data, isLoading, isError, error, refetch } = useQuery<Candidate[], Error>({
    queryKey: ['candidates'],
    queryFn: fetchCandidates,
    staleTime: 1000 * 60 * 5,
  });

  
  
  const useCandidate = (id: string | undefined) => {
    return useQuery<Candidate, Error>({
      queryKey: ['candidates', id],
      queryFn: () => fetchCandidate(id!),
      enabled: !!id, 
      staleTime: 1000 * 60 * 5,
    });
  };

  
  const updateMutation = useMutation<void, Error, UpdateCandidateVariables>({
    mutationFn: updateCandidate,
    onSuccess: (_, variables) => {
      
      queryClient.setQueryData<Candidate[]>(['candidates'], (old) =>
        old?.map((candidate) =>
          candidate.id === variables.id
            ? { ...candidate, ...variables.payload }
            : candidate
        ) ?? []
      );
      
      
      queryClient.invalidateQueries({ queryKey: ['candidates', String(variables.id)] });
    },
    onError: (error) => {
      console.error('Failed to update candidate:', error);
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });

  return {
    candidates: data ?? [],
    isLoading,
    isError,
    error: error?.message ?? null,
    refetch,
    
    useCandidate, 

    updateCandidate: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error?.message ?? null,
  };
}