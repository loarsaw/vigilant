import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import {
  CreateJobApplicationPayload,
  JobApplication,
  PaginatedPositionResponse,
  PositionFilters,
} from "./types";
import { useEffect } from "react";

const fetchPositions = async (
  filters: PositionFilters = {},
): Promise<PaginatedPositionResponse> => {
  const response = await apiClient.get<PaginatedPositionResponse>("/positions", {
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
    payload,
  );
  return response.data;
};

export function useHiringPositions(filters: PositionFilters = {}) {
  const queryClient = useQueryClient();
  const queryKey = ["positions", filters];

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
  const scheduledInterview = response?.data.find((p) => p.interview?.session_id)?.interview ?? null;

  // Use useEffect to safely write to query cache as a side effect
  useEffect(() => {
    if (scheduledInterview) {
      queryClient.setQueryData(["interview", "session"], scheduledInterview);
    }
  }, [scheduledInterview, queryClient]);

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
      queryClient.invalidateQueries({ queryKey: ["positions"] });
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
