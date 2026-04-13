import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";

export interface HiringPosition {
  id: string;
  position_title: string;
  department: string;
  location: string;
  employment_type: string;
  experience_required: string;
  salary_range_min: number;
  salary_range_max: number;
  salary_range_text: string;
  number_of_openings: number;
  job_description: string;
  requirements: string;
  status: "active" | "inactive";
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface PaginatedPositionResponse {
  data: HiringPosition[];
  limit: number;
  page: number;
  total: number;
  total_pages: number;
}

export interface PositionFilters {
  search?: string;
  status?: "active" | "inactive";
  department?: string;
  location?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}

export interface CreatePositionPayload {
  position_title: string;
  department: string;
  location: string;
  employment_type: string;
  experience_required: string;
  salary_range_min: number;
  salary_range_max: number;
  salary_range_text: string;
  number_of_openings: number;
  job_description: string;
  requirements: string;
}

export type UpdatePositionPayload = Partial<CreatePositionPayload> & {
  status?: "active" | "inactive";
};

const fetchPositions = async (filters: PositionFilters): Promise<PaginatedPositionResponse> => {
  const params = new URLSearchParams();

  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.department) params.set("department", filters.department);
  if (filters.location) params.set("location", filters.location);
  if (filters.is_active !== undefined) params.set("is_active", String(filters.is_active));
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));

  const response = await apiClient.get<PaginatedPositionResponse>(
    `/positions?${params.toString()}`,
  );
  return response.data;
};

const createPosition = async (payload: CreatePositionPayload): Promise<HiringPosition> => {
  const response = await apiClient.post<HiringPosition>("/positions", payload);
  return response.data;
};

const updatePosition = async ({
  id,
  payload,
}: {
  id: string;
  payload: UpdatePositionPayload;
}): Promise<HiringPosition> => {
  const response = await apiClient.patch<HiringPosition>(`/positions/${id}`, payload);
  return response.data;
};

const togglePositionActive = async (id: string): Promise<HiringPosition> => {
  const response = await apiClient.patch<HiringPosition>(`/positions/${id}/toggle-active`);
  return response.data;
};

const deletePosition = async (id: string): Promise<void> => {
  await apiClient.delete(`/positions/${id}`);
};

export function useHiringPositions(filters: PositionFilters = {}) {
  const queryClient = useQueryClient();
  const queryKey = ["admin", "positions", filters] as const;

  const {
    data: response,
    isLoading: isLoadingPositions,
    isFetching: isFetchingPositions,
    isError: isFetchError,
    error: fetchError,
    refetch: refetchPositions,
  } = useQuery<PaginatedPositionResponse, Error>({
    queryKey,
    queryFn: () => fetchPositions(filters),
    staleTime: 1000 * 60 * 5,
  });

  const createMutation = useMutation<HiringPosition, Error, CreatePositionPayload>({
    mutationFn: createPosition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "positions"] });
    },
  });

  const updateMutation = useMutation<
    HiringPosition,
    Error,
    { id: string; payload: UpdatePositionPayload }
  >({
    mutationFn: updatePosition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "positions"] });
    },
  });

  const toggleMutation = useMutation<HiringPosition, Error, string>({
    mutationFn: togglePositionActive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "positions"] });
    },
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: deletePosition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "positions"] });
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
    isFetchingPositions,
    isFetchError,
    fetchErrorMessage: fetchError?.message ?? null,
    refetchPositions,

    createPosition: createMutation.mutate,
    createPositionAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isCreateSuccess: createMutation.isSuccess,
    createErrorMessage: createMutation.error?.message ?? null,
    resetCreate: createMutation.reset,

    updatePosition: updateMutation.mutate,
    updatePositionAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    isUpdateSuccess: updateMutation.isSuccess,
    updateErrorMessage: updateMutation.error?.message ?? null,
    resetUpdate: updateMutation.reset,

    togglePositionActive: toggleMutation.mutate,
    togglePositionActiveAsync: toggleMutation.mutateAsync,
    isToggling: toggleMutation.isPending,
    toggleErrorMessage: toggleMutation.error?.message ?? null,

    deletePosition: deleteMutation.mutate,
    deletePositionAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteErrorMessage: deleteMutation.error?.message ?? null,
  };
}
