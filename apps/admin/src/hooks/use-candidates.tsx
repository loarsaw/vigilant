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

interface CandidateResponse {
  candidate: Candidate;
  is_online: boolean;
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

interface ActiveUsersResponse {
  active_users: string[];
  count: number;
}

async function fetchCandidates(): Promise<Candidate[]> {
  const response = await apiClient.get<Candidate[]>('/candidates');
  return response.data;
}

async function fetchCandidate(id: string): Promise<CandidateResponse> {
  const response = await apiClient.get<CandidateResponse>(`/candidates/${id}`);
  return response.data;
}

async function updateCandidate({ id, payload }: UpdateCandidateVariables): Promise<void> {
  await apiClient.patch(`/candidates/${id}`, payload);
}

async function fetchActiveUsers(): Promise<ActiveUsersResponse> {
  const response = await apiClient.get<ActiveUsersResponse>('/active-users');
  return response.data;
}

export function useCandidates() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery<Candidate[], Error>({
    queryKey: ['candidates'],
    queryFn: fetchCandidates,
    staleTime: 1000 * 60 * 5,
  });

  const { data: activeUsersData } = useQuery<ActiveUsersResponse, Error>({
    queryKey: ['admin', 'active-users'],
    queryFn: fetchActiveUsers,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

const useCandidate = (id: string | undefined) => {
  return useQuery<CandidateResponse, Error>({
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

  const candidatesWithPresence = (data ?? []).map((candidate) => ({
    ...candidate,
    isOnline: activeUsersData?.active_users.includes(String(candidate.id)) ?? false,
  }));

  return {
    candidates: candidatesWithPresence,
    isLoading,
    isError,
    error: error?.message ?? null,
    refetch,

    activeUserIds: activeUsersData?.active_users ?? [],
    activeUserCount: activeUsersData?.count ?? 0,

    useCandidate,

    updateCandidate: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error?.message ?? null,
  };
}