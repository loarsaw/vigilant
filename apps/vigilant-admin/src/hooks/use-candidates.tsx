import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import { useEffect, useState } from 'react';

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


interface PaginatedResponse {
  data: Candidate[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

interface CandidateQueryParams {
  page: number;
  limit: number;
  search: string;
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

async function bulkCreateCandidates(candidates: { full_name: string; email: string; password: string }[]): Promise<{ message: string; count: number }> {
  const response = await apiClient.post('/bulk-candidates', candidates);
  return response.data;
}


async function fetchCandidates(params: CandidateQueryParams): Promise<PaginatedResponse> {
  const response = await apiClient.get<PaginatedResponse>('/candidates', { params });
  return response.data;
}

async function fetchCandidate(id: string): Promise<CandidateResponse> {
  const response = await apiClient.get<CandidateResponse>(`/candidates/${id}`);
  return response.data;
}

async function updateCandidate({ id, payload }: UpdateCandidateVariables): Promise<void> {
  await apiClient.put(`/candidates/${id}`, payload);
}

async function fetchActiveUsers(): Promise<ActiveUsersResponse> {
  const response = await apiClient.get<ActiveUsersResponse>('/active-users');
  return response.data;
}

async function createCandidate(payload: { full_name: string; email: string; password: string }): Promise<Candidate> {
  const response = await apiClient.post<Candidate>('/candidates', payload);
  return response.data;
}


export function useCandidates() {
  const queryClient = useQueryClient();

 const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');

  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading, isError, error, refetch } = useQuery<PaginatedResponse, Error>({
    queryKey: ['candidates', { page, limit, search: debouncedSearch }],
    queryFn: () => fetchCandidates({ page, limit, search: debouncedSearch }),
    staleTime: 1000 * 60 * 2,
    placeholderData: (prev) => prev, 
    
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


const bulkCreateMutation = useMutation({
  mutationFn: bulkCreateCandidates,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['candidates'] });
  },
});



const createMutation = useMutation<Candidate, Error, Parameters<typeof createCandidate>[0]>({
  mutationFn: createCandidate,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['candidates'] }); 
  },
});
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

  
const candidatesWithPresence = (data?.data ?? []).map((candidate) => ({
  ...candidate,
  isOnline: activeUsersData?.active_users.includes(String(candidate.id)) ?? false,
}));
  

return {
    candidates: candidatesWithPresence,
   total: data?.total ?? 0,
   page,
    limit,
    search,
    setPage,
    setLimit,
    setSearch,
    totalPages: data?.total_pages ?? 1,
    isLoading,
    isError,
    error: error?.message ?? null,
    refetch,

    activeUserIds: activeUsersData?.active_users ?? [],
    activeUserCount: activeUsersData?.count ?? 0,

    useCandidate,

    addCandidate: createMutation.mutate,
    isAdding: createMutation.isPending,

    updateCandidate: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error?.message ?? null,

     bulkCreateCandidates: bulkCreateMutation.mutate,
  isBulkCreating: bulkCreateMutation.isPending,
  bulkCreateError: bulkCreateMutation.error?.message ?? null,
  };
}