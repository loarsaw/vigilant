import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';


export interface HiringPosition {
  id: string;
  position_title: string;
  department: string;
  location: string;
  employment_type: string;
  experience_required: string;
  salary_range_min: number | null;
  salary_range_max: number | null;
  salary_range_text: string;
  number_of_openings: number;
  job_description: string;
  requirements: string;
  status: 'active' | 'inactive';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  application_id?: string;
  application_status?: 'applied' | 'screening' | 'interviewing' | 'offered' | 'hired' | 'rejected' | 'withdrawn';
  applied_at?: string;
  interview?: {
    scheduled_at: string;
    interview_url: string;
    status: string;
  };
}

export interface PaginatedPositionResponse {
  data: HiringPosition[];
  limit: number;
  page: number;
  total: number;
  total_pages: number;
}

export interface PositionFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  department?: string;
  location?: string;
  is_active?: boolean;
}

export interface CreateJobApplicationPayload {
  cover_letter?: string;
}

export interface JobApplication {
  id: string;
  candidate_id: string;
  position_id: string;
  status: 'applied' | 'screening' | 'interviewing' | 'offered' | 'hired' | 'rejected' | 'withdrawn';
  applied_at: string;
  updated_at: string;
  cover_letter?: string;
}

const fetchPositions = async (filters: PositionFilters = {}): Promise<PaginatedPositionResponse> => {
  const response = await apiClient.get<PaginatedPositionResponse>('/positions', {
    params: filters,
  });
  return response.data;
};

const applyForPosition = async ({
  positionId,
  payload,
}: {
  positionId: string;
  payload: CreateJobApplicationPayload;
}): Promise<{ data: JobApplication }> => {
  const response = await apiClient.post<{ data: JobApplication }>(
    `/positions/${positionId}/apply`,
    payload
  );
  return response.data;
};

export function useHiringPositions(filters: PositionFilters = {}) {
  const queryClient = useQueryClient();
  const queryKey = ['positions', filters];

  const {
    data: response,
    isLoading: isLoadingPositions,
    isError: isFetchError,
    error: fetchError,
    refetch,
  } = useQuery<PaginatedPositionResponse, Error>({
    queryKey,
    queryFn: () => fetchPositions(filters),
    staleTime: 1000 * 60 * 5, 
  });

  const {
    mutate: applyMutate,
    mutateAsync: applyMutateAsync,
    isPending: isApplying,
    isError: isApplyError,
    error: applyError,
    reset: resetApply,
  } = useMutation<
    { data: JobApplication }, 
    Error, 
    { positionId: string; payload: CreateJobApplicationPayload }
  >({
    mutationFn: applyForPosition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
  });

  return {
    positions: response?.data ?? [],
    pagination: {
      total: response?.total ?? 0,
      totalPages: response?.total_pages ?? 0,
      currentPage: response?.page ?? 1,
      limit: response?.limit ?? 10,
    },
    isLoadingPositions,
    isFetchError,
    fetchErrorMessage: fetchError?.message ?? null,
    refetchPositions: refetch,

    applyForPosition: applyMutate,
    applyForPositionAsync: applyMutateAsync,
    isApplying,
    isApplyError,
    applyErrorMessage: applyError?.message ?? null,
    resetApply,
  };
}